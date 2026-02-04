METRIC_PROFILES = {
    "google_compute_instance": [
        {
            "name": "cpu_high",
            "metric": "compute.googleapis.com/instance/cpu/utilization",
            "threshold": 0.80,
            "duration": "60s",
            "severity": "critical"
        },
        {
            "name": "disk_read_high",
            "metric": "compute.googleapis.com/instance/disk/read_bytes_count",
            "threshold": 100000000,
            "duration": "120s",
            "severity": "warning"
        }
    ],
    "google_sql_database_instance": [
        {
            "name": "sql_cpu_high",
            "metric": "cloudsql.googleapis.com/database/cpu/utilization",
            "threshold": 0.75,
            "duration": "60s",
            "severity": "critical"
        },
        {
            "name": "sql_connections_high",
            "metric": "cloudsql.googleapis.com/database/database_connections",
            "threshold": 100,
            "duration": "60s",
            "severity": "warning"
        }
    ],
    "google_compute_instance_group_manager": [
        {
            "name": "asg_cpu_high",
            "metric": "compute.googleapis.com/instance/cpu/utilization",
            "threshold": 0.70,
            "duration": "120s",
            "severity": "critical"
        }
    ]
}
