import { PrismaClient } from "@prisma/client";

import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { Request, Response } from "express"
import { getLocalDate } from "../../../utils/getTimeOffset"
import prisma from "../../../utils/prisma";

export const getFinanceAnalytics = async (req: Request, res: Response) => {
    const {providerId} = req.user
    const { year, month } = req.query as {
      year?: string
      month?: string
    }

    
    const now = getLocalDate(new Date())
    
    const resolvedYear =
    year && year !== "" ? Number(year) : 1970
    
    const resolvedMonth =
    month && month !== ""
    ? Number(month) - 1
    : now.getMonth()

    const selectedDate = new Date(resolvedYear, resolvedMonth, 1)

    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const yearStart = startOfYear(new Date(resolvedYear, 0, 1))
    const yearEnd = endOfYear(new Date(year === "" ? now.getFullYear() : resolvedYear, 0, 1))

    try {

    // --- 1. REVENUE METRICS ---
    const totalMonthly = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: 
      { 
        client: {providerId}, 
        status: "PAID", 
        paidAt: { gte: monthStart!, lte: monthEnd! },
      },
    })
    const paymentss = await prisma.payment.findMany({
      where: {
        client: { providerId },
        status: "PAID",
        paidAt: { gte: yearStart!, lte: yearEnd! },
      },
    })

    console.log("Payments in year:", paymentss.length)

    const totalYTD = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
      client: { providerId },
      status: "PAID",
      paidAt: { gte: month !== "" ? monthStart : yearStart!, lte: month !== "" ? monthEnd! : yearEnd! },
    },
    })

    // Group revenue by service plan
    const revenueByService = await prisma.payment.groupBy({
      where: {account: {client: {providerId}}, status: "PAID" , 
        paidAt: { gte: month !== "" ? monthStart : yearStart!, lte: month !== "" ? monthEnd! : yearEnd! },
      },
      by: ["accountId"],
      _sum: { amount: true },
    })

    const byServiceType: { name: string; value: number }[] = []
    for (const r of revenueByService) {
      const account = await prisma.accounts.findUnique({
        where: { id: r.accountId! },
        include: { servicePlan: true },
      })
      if (account?.servicePlan) {
        const existing = byServiceType.find((x) => x.name === account.servicePlan?.name)
        if (existing) existing.value += Number(r._sum.amount || 0)
        else byServiceType.push({ name: account.servicePlan.name, value: Number(r._sum.amount || 0) })
      }
    }

    // Revenue trend (past 12 months)
    const trend: { month: string; revenue: number }[] = []
    for (let i = 0; i < 12; i++) {
      const from = startOfMonth(subMonths(now, i))
      const to = endOfMonth(subMonths(now, i))
      const result = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { client: {providerId}, status: "PAID", paidAt: { gte: from, lte: to } },
      })
      trend.unshift({
        month: from.toLocaleString("default", { month: "short" }),
        revenue: Number(result._sum.amount || 0),
      })
    }

    const totalClients = await prisma.client.count({where: {providerId}})
    const avgPerClient = totalClients > 0 ? Number(totalYTD._sum.amount || 0) / totalClients : 0

    // --- 2. BILLING METRICS ---
    const dueDateFilter = {
      dueDate: {
        gte: month !== "" ? monthStart! : yearStart!,
        lte: month !== "" ? monthEnd! : yearEnd!,
      }
    }

    const [totalInvoices, paid, pending, overdue, partialPayments] =
    await Promise.all([
      prisma.billing.count({
        where: {
          client: { providerId },
          ...dueDateFilter,
        },
      }),
      prisma.billing.count({
        where: {
          client: { providerId },
          status: "PAID",
          ...dueDateFilter,
        },
      }),
      prisma.billing.count({
        where: {
          client: { providerId },
          status: "PENDING",
          ...dueDateFilter,
        },
      }),
      prisma.billing.count({
        where: {
          client: { providerId },
          status: "OVERDUE",
          ...dueDateFilter,
        },
      }),
      prisma.billing.count({
        where: {
          client: { providerId },
          status: "PARTIALLY_PAID",
          ...dueDateFilter,
        },
      }),
    ])

    const overdueClientsRaw = await prisma.billing.findMany({
      where: { client: {providerId}, status: "OVERDUE" },
      include: { client: true },
    })

    const overdueClients = overdueClientsRaw.map((b) => ({
      name: b.client.fullName,
      amount: b.amount - (b.paidAmount || 0),
      daysOverdue: Math.floor((now.getTime() - b.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    // --- 3. ACCOUNTS RECEIVABLE ---
    const totalOutstandingData = await prisma.billing.findMany({
      where: {
        client: { providerId },
        status: { in: ["OVERDUE", "PARTIALLY_PAID", "PENDING"] },
      },
      select: {
        amount: true,
        paidAmount: true,
      },
    });
    const totalOutstanding = totalOutstandingData.reduce(
      (acc, b) => acc + (b.amount - (b.paidAmount || 0)),
      0
    );

    // Simple aging buckets
    const agingBuckets = [
      { label: "(0–30 days)", min: 0, max: 30 },
      { label: "(31–60 days)", min: 31, max: 60 },
      { label: "((61–90 days)", min: 61, max: 90 },
      { label: "(90+ days)", min: 91, max: 9999 },
      { label: "Not yet due", min: Number.MIN_SAFE_INTEGER, max: -1 },
    ]

    const aging = await Promise.all(
      agingBuckets.map(async (bucket) => {
        const bills = await prisma.billing.findMany({
          where: {
            client: {providerId},
            status: { in: ["OVERDUE", "PARTIALLY_PAID", "PENDING"] },
          },
        })
        const filtered = bills.filter((b) => {
          const days = Math.floor((now.getTime() - b.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          return days >= bucket.min && days <= bucket.max
        })
        const amount = filtered.reduce((sum, b) => sum + (b.amount - (b.paidAmount || 0)), 0)
        return { range: bucket.label, amount, count: filtered.length }
      })
    )

    const topDebtorsRaw = await prisma.client.findMany({
      where: {
        providerId
      },
      include: { billings: true },
    })
    const topDebtors = topDebtorsRaw
      .map((c) => ({
        name: c.fullName,
        accountNumber: c.accountNumber,
        amount: c.billings.reduce((sum, b) => sum + (b.amount - (b.paidAmount || 0)), 0),
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // --- 4. PAYMENT METHODS & COLLECTIONS ---
    const payments = await prisma.payment.findMany({
      where: {
        client: { providerId },
        status: "PAID",
        paidAt: { gte: month !== "" ? monthStart : yearStart!, lte: month !== "" ? monthEnd! : yearEnd! },
      },
    })

    const methodMap: Record<string, { amount: number; count: number }> = {}
    payments.forEach((p) => {
      const key = p.paymentMethod || "Unknown"
      if (!methodMap[key]) methodMap[key] = { amount: 0, count: 0 }
      methodMap[key].amount += Number(p.amount)
      methodMap[key].count += 1
    })
    const breakdown = Object.entries(methodMap).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
    }))

    // Collections trend (monthly totals)
    const collectionsTrend: { month: string; amount: number }[] = []
    for (let i = 0; i < 12; i++) {
      const from = startOfMonth(subMonths(now, i))
      const to = endOfMonth(subMonths(now, i))
      const result = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { client: {providerId}, status: "PAID", paidAt: { gte: from, lte: to } },
      })
      collectionsTrend.unshift({
        month: from.toLocaleString("default", { month: "short" }),
        amount: Number(result._sum.amount || 0),
      })
    }

    const failedTransactions = await prisma.payment.count({
      where: { client: {providerId}, status: { in: ["FAILED", "EXPIRED", "CANCELLED"] } },
    })

    // --- 5. DISCOUNTS, REFUNDS, WRITE-OFFS ---
    const discounts = { totalDiscounts: 0 } // Placeholder if you add a discounts table later
    const refunds = { amount: 0, count: 0, reasons: [] }
    const writeOffs = 0

    // --- 6. CUSTOMER METRICS ---
    const lifetimeValue = avgPerClient * 12
    const churnedClients = await prisma.client.count({ where: {providerId, status: "TERMINATED" } })
    const churnedWithBalance = {
      count: churnedClients,
      totalBalance: topDebtorsRaw
        .filter((c) => c.status === "TERMINATED")
        .reduce((sum, c) => sum + c.billings.reduce((s, b) => s + (b.amount - (b.paidAmount || 0)), 0), 0),
    }

    const newVsReturning: { month: string; new: number; returning: number }[] = []
    for (let i = 0; i < 12; i++) {
      const from = startOfMonth(subMonths(now, i))
      const to = endOfMonth(subMonths(now, i))
      const newCount = await prisma.client.count({
        where: { providerId, createdAt: { gte: from, lte: to } },
      })
      const returningCount = Math.max(0, totalClients - newCount)
      newVsReturning.unshift({
        month: from.toLocaleString("default", { month: "short" }),
        new: newCount,
        returning: returningCount,
      })
    }

    // --- 7. ALERTS ---
    const revenueTarget = {
      actual: Number(totalMonthly._sum.amount || 0),
      target: 100000, // set your own target logic
      variance:
        Number(totalMonthly._sum.amount || 0) - 100000,
    }

    const arTotal = Number(totalOutstanding || 0)
    const threshold = 0.3 * Number(totalMonthly._sum.amount || 1)
    const arThreshold = {
      current: arTotal,
      threshold,
      exceeded: arTotal > threshold,
    }

    const alertTopOverdueClients = overdueClients.slice(0, 5)
    const pendingRefunds = 0 // Placeholder

    // --- Assemble final response ---
    const dashboardMetrics = {
      revenue: {
        totalMonthly: Number(totalMonthly._sum.amount || 0),
        totalYTD: Number(totalYTD._sum.amount || 0),
        byServiceType,
        trend,
        averagePerClient: avgPerClient,
      },
      billing: {
        totalInvoices,
        paid,
        pending,
        overdue,
        overdueClients,
        partialPayments,
      },
      accountsReceivable: {
        totalOutstanding: arTotal,
        aging,
        topDebtors,
      },
      paymentMethods: {
        breakdown,
        collectionsTrend,
        failedTransactions,
      },
      discounts: {
        totalDiscounts: discounts.totalDiscounts,
        refunds,
        writeOffs,
      },
      customerMetrics: {
        lifetimeValue,
        churnedWithBalance,
        newVsReturning,
      },
      alerts: {
        revenueTarget,
        arThreshold,
        topOverdueClients: alertTopOverdueClients,
        pendingRefunds,
      },
    }

    return res.json(dashboardMetrics)
  } catch (error) {
    console.error("Finance analytics error:", error)
    return res.status(500).json({ message: "Failed to load finance analytics" })
  }
}