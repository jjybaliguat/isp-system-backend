import {Request, Response} from 'express'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getNetworkHierarchy = async(req: Request, res: Response) => {
    const {providerId} = req.user
    try {
        const olts = await prisma.oLT.findMany({
            where: {
                providerId,
            },
            orderBy: {
                createdAt: "asc"
            },
            include: {
                ponPorts: {
                include: {
                    lcps: {
                    include: {
                        odcs: {
                            include: {
                                odps: {
                                    include: {
                                        ports: {
                                        include: {
                                            client: true,
                                            account: {
                                                include: {
                                                    client: true
                                                }
                                            }
                                        },
                                        orderBy: {
                                            portNumber: 'asc'
                                        }
                                        }
                                    },
                                },
                            }
                        },
                        odps: {
                            include: {
                                ports: {
                                include: {
                                    client: true,
                                    account: {
                                        include: {
                                            client: true
                                        }
                                    }
                                },
                                orderBy: {
                                    portNumber: 'asc'
                                }
                                }
                            },
                        },
                    },
                    },
                },
                }
            },
            })

        return res.status(200).json(olts)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const getOdps = async(req: Request, res: Response) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const {providerId} = req.user

    try {
        const odps = await prisma.oDP.findMany({
            where: {
                providerId,
                odpCode: {
                    contains: search,
                    mode: "insensitive"
                }
            }
        })

        return res.status(200).json(odps)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const getOdpPorts = async(req: Request, res: Response) => {
    const odpId = typeof req.query.odpId === "string" ? req.query.odpId.trim() : "";
    const {providerId} = req.user
    try {
        const odpPorts = await prisma.odpPort.findMany({
            where: {
                odp: {
                    id: odpId,
                    providerId
                }
            },
            include: {
                odp: true
            },
            orderBy: {
                portNumber: "asc"
            }
        })

        return res.status(200).json(odpPorts)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const getOdpPort = async(req: Request, res: Response) => {
    const accountId = typeof req.query.odpId === "string" ? req.query.odpId.trim() : "";
    const {providerId} = req.user
    try {
        const odpPort = await prisma.odpPort.findUnique({
            where: {
                accountId
            }
        })

        return res.status(200).json(odpPort)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const createOlt = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const body = req.body
    const {latitude, longitude, ponCount} = body

    try {
        const olt = await prisma.oLT.create({
            data: {
                ...body,
                latitude: Number(latitude),
                longitude: Number(longitude),
                ponCount: Number(ponCount),
                providerId
            }
        })

        const ponPortsData = Array.from({ length: Number(ponCount) }, (_, i) => ({
            portNumber: i + 1,
            oltId: olt.id,
        }));

        await prisma.ponPort.createMany({
            data: ponPortsData,
        });

        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "CREATE",
            entity: "Network",
            userId,
            message: `Network OLT created`,
            providerId,
            },
        })
        .catch(console.error);

        return res.status(201).json(olt)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const createPonPort = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const body = req.body
    const {oltId} = body
    const {portNumber} = body

    try {
        const isPonPortExists = await prisma.ponPort.findFirst({
            where: {
                portNumber: Number(portNumber),
                oltId
            }
        })

        if(isPonPortExists) return res.status(400).json({message: `Pon port number ${portNumber} already exists`})

        const ponPort = await prisma.ponPort.create({
            data: {
                ...body,
                portNumber: Number(portNumber)
            }
        })
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "CREATE",
            entity: "Network",
            userId,
            message: `Network PON Port created`,
            providerId,
            },
        })
        .catch(console.error);
        return res.status(201).json(ponPort)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const createLcp = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const body = req.body
    const {latitude, longitude, ponPortId} = body
    const lat = Number(latitude);
    const lng = Number(longitude);

    try {
        const ponPort = await prisma.ponPort.findUnique({
            where: {
                id: ponPortId
            }
        })

        const lcp = await prisma.lCP.create({
            data: {
                ...body,
                latitude: lat,
                longitude: lng,
                ponPortId: ponPortId,
                oltId: ponPort?.oltId,
                providerId
            }
        })
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "CREATE",
            entity: "Network",
            userId,
            message: `Network LCP created`,
            providerId,
            },
        })
        .catch(console.error);
        return res.status(201).json(lcp)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const createOdc = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const body = req.body
    const {latitude, longitude} = body

    const lat = Number(latitude);
    const lng = Number(longitude);

    try {
        const odc = await prisma.oDC.create({
            data: {
                ...body,
                latitude: lat,
                longitude: lng,
                providerId
            }
        })

        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "CREATE",
            entity: "Network",
            userId,
            message: `Network ODC created`,
            providerId,
            },
        })
        .catch(console.error);

        return res.status(201).json(odc)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}
export const createOdp = async(req: Request, res: Response) => {
    const {id: userId, providerId} = req.user
    const body = req.body
    const {latitude, longitude, portCount} = body
    const {odcId, lcpId} = body

    const lat = Number(latitude);
    const lng = Number(longitude);
    const count = Number(portCount);

    try {
        const lcp = await prisma.lCP.findUnique({
            where: {
                id: lcpId
            }
        })
        const odc = await prisma.oDC.findUnique({
            where: {
                id: odcId
            }
        })
        
        const odp = await prisma.oDP.create({
            data: {
                ...body,
                odcId: odc? odc.id : undefined,
                lcpId: lcp? lcp.id : undefined,
                latitude: lat,
                longitude: lng,
                portCount: count,
                providerId
            }
        })

        const portsData = Array.from({ length: count }, (_, i) => ({
        portNumber: i + 1,
        odpId: odp.id,
        }));

        await prisma.odpPort.createMany({
        data: portsData,
        });

        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "CREATE",
            entity: "Network",
            userId,
            message: `Network ODP created`,
            providerId,
            },
        })
        .catch(console.error);

        return res.status(201).json(odp)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const createOdpPort = async(req: Request, res: Response) => {
    const {portNumber, odpId} = req.body
    const {id: userId, providerId} = req.user
    try {
        const isPortExist = await prisma.odpPort.findFirst({
            where: {
                portNumber: Number(portNumber),
                odpId
            }
        })

        if(isPortExist){
            return res.status(400).json({message: `Odp Port ${portNumber} already exists.`})
        }

        const odpPort = await prisma.odpPort.create({
            data: {
                portNumber: Number(portNumber),
                odpId
            }
        })
        
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "CREATE",
            entity: "Network",
            userId,
            message: `Network ODP Port created`,
            providerId,
            },
        })
        .catch(console.error);

        return res.status(201).json(odpPort)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const assignOdpPort = async(req: Request, res: Response) => {
    const {accountId, portId} = req.body
    const {id: userId, providerId} = req.user
    try {
        const account = await prisma.accounts.findUnique({
            where: {
                id: accountId
            },
            include: {
                client: {
                    select: {
                        fullName: true
                    }
                }
            }
        })

        if(!account) return res.status(400).json({message: "Client not found."})

        const odpPort = await prisma.odpPort.update({
            where: {
                id: portId
            },
            data: {
                accountId,
                status: "OCCUPIED"
            },
            include: {
                odp: {
                    select: {
                        odpCode: true
                    }
                }
            }
        })
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "ASSIGN",
            entity: "Network",
            userId,
            message: `Network ODP ${odpPort.odp.odpCode} Port ${odpPort.portNumber} assigned to client ${account.client.fullName}`,
            providerId,
            },
        })
        .catch(console.error);
        return res.status(200).json({message: "Port assigned to client successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const unAssignOdpPort = async(req: Request, res: Response) => {
    const {accountId} = req.body
    const {id: userId, providerId} = req.user
    try {
        const odpPort = await prisma.odpPort.findUnique({
            where: {
                accountId
            },
            include: {
                account: {
                    include: {
                        client: true
                    }
                }
            }
        })
        if(!odpPort){
            return res.status(400).json({message: "ODP Port not found."})
        }
        const odpPortUpdated = await prisma.odpPort.update({
            where: {
                accountId
            },
            data: {
                clientId: null,
                accountId: null,
                status: "AVAILABLE"
            },
            include: {
                odp: {
                    select: {
                        odpCode: true
                    }
                }
            }
        })
        // ---- LOG ACTION (non-blocking) ----
        prisma.log
        .create({
            data: {
            action: "UNASSIGN",
            entity: "Network",
            userId,
            message: `Network ODP ${odpPortUpdated.odp.odpCode} Port ${odpPortUpdated.portNumber} unassigned to client ${odpPort.account?.client.fullName}`,
            providerId,
            },
        })
        .catch(console.error);
        return res.status(200).json({message: "Port unassigned to client successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteOlt = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    try {
        await prisma.oLT.delete({
            where: {
                id
            }
        })

        return res.status(200).json({message: "Olt delete successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const deletePonPort = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    try {
        await prisma.ponPort.delete({
            where: {
                id
            }
        })

        return res.status(200).json({message: "Olt delete successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteLcp = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    try {
        await prisma.lCP.delete({
            where: {
                id
            }
        })

        return res.status(200).json({message: "Olt delete successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteOdc = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    try {
        await prisma.oDC.delete({
            where: {
                id
            }
        })

        return res.status(200).json({message: "Olt delete successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteOdp = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}
    try {
        await prisma.oDP.delete({
            where: {
                id
            }
        })

        return res.status(200).json({message: "Olt delete successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}

export const deleteOdpPort = async(req: Request, res: Response) => {
    const {id} = req.params as {id: string}

    console.log(id)
    try {
        await prisma.odpPort.delete({
            where: {
                id
            }
        })

        return res.status(200).json({message: "Olt delete successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}