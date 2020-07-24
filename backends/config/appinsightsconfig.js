{
    backends: ["./backends/appinsights"],  // [Required] The Application Insighst StatsD backend
    aiInstrumentationKey: "your_application_Insights_Instrumentation_Key",  // [Required] Your instrumentation key
    aiPrefix: "my_prefix",  // [Optional] Send only metrics with this prefix
    aiRoleName: "my_role_name",  // [Optional] Add this role name context tag to every metric
    aiRoleInstance: "my_role_instance",  // [Optional] Add this role instance context tag to every metric
    aiTrackStatsDMetrics: true,  // [Optional] Send StatsD internal metrics to Application Insights
    log: {
        backend: "stdout",    // where to log: stdout or syslog [string, default: stdout]
        level: ""       // log level for [node-]syslog [string, default: LOG_INFO]
    },
    debug: false
}