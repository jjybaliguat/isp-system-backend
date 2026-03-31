"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMikrotikConnectScript = generateMikrotikConnectScript;
function generateMikrotikConnectScript(routerName, wgKey, serverListenPort, serverPublicKey, serverIp) {
    const interfaceName = routerName.replace(/\s+/g, "_"); // no spaces
    const wireguardGateway = "10.10.10.1";
    return `
<div class="space-y-3 text-xs font-mono">

  <div class="text-muted-foreground"># MikroTik WireGuard setup for ${routerName}</div>

  <div>
    <div class="text-muted-foreground"># Add WireGuard interface</div>
    <div>/interface wireguard add name=${interfaceName} listen-port=${serverListenPort} private-key="${wgKey.privateKey}"</div>
  </div>

  <div>
    <div class="text-muted-foreground"># Assign IP address to interface</div>
    <div>/ip address add address=${wgKey.assignedIp}/24 interface=${interfaceName}</div>
  </div>

  <div>
    <div class="text-muted-foreground"># Add peer (server)</div>
    <div class="break-all">
      /interface wireguard peers add interface=${interfaceName} public-key="${serverPublicKey}" allowed-address=0.0.0.0/0 endpoint-address=${serverIp} endpoint-port=${serverListenPort} persistent-keepalive=25
    </div>
  </div>

  <div>
    <div class="text-muted-foreground"># Enable API service and allow only server IP</div>
    <div>/ip service enable api</div>
    <div>/ip service set api address=${wireguardGateway}/32</div>
  </div>

  <div class="text-muted-foreground"># Done</div>

</div>
`;
}
//# sourceMappingURL=generateMikrotikScript.js.map