{
    node_groups: [
        {
            id: "stats"
            , key_prefixs: ["stats.rc.tatooine.", "stats.timers.rc.tatooine."]
            , nodes: [
                {port: 8127, adminPort: 8128}
                , {port: 8129, adminPort: 8130}
                , {port: 8131, adminPort: 8132}
            ]
        }
        , {
            id: "other_stats"
            , nodes: [
                {port: 8137, adminPort: 8138}
                , {port: 8133, adminPort: 8134}
            ]
        }
    ]

    , udp_version: 'udp4'
    , host:  '0.0.0.0'
    , forkCount: 0
    , checkInterval: 1000
    , cacheSize: 10000
    , node_hosts: ['10.32.42.249', '10.32.56.136', '10.32.58.177', '10.32.74.241', '10.32.100.104', '10.32.71.152']
    , node_ports: [8127, 8129, 8131, 8133, 8137]
}
