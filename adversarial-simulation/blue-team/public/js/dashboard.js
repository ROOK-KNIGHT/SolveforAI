/**
 * Dashboard JavaScript for Bot Detection
 * 
 * Handles dashboard functionality, data fetching, and visualization
 */

// Initialize charts, socket connection, and event handlers
document.addEventListener('DOMContentLoaded', function() {
    // Socket.IO connection
    const socket = io();
    
    // Chart objects for reuse
    const charts = {};
    
    // Time range for data fetching
    let timeRange = '1h';
    
    // Tab navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('data-bs-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // Time range selector
    const timeRangeSelector = document.getElementById('timeRangeSelector');
    timeRangeSelector.addEventListener('change', function() {
        timeRange = this.value;
        fetchDashboardData();
    });
    
    // Refresh button
    const refreshButton = document.getElementById('refreshButton');
    refreshButton.addEventListener('click', fetchDashboardData);
    
    // Filter buttons for detections table
    document.getElementById('filterAll').addEventListener('click', () => filterDetectionsTable('all'));
    document.getElementById('filterHighConf').addEventListener('click', () => filterDetectionsTable('high'));
    document.getElementById('filterBlocked').addEventListener('click', () => filterDetectionsTable('blocked'));
    
    // Initialize dashboard charts
    initializeCharts();
    
    // Fetch initial data
    fetchDashboardData();
    
    // Set up real-time updates
    setupRealTimeUpdates();
    
    /**
     * Initialize all charts with default configurations
     */
    function initializeCharts() {
        // Traffic chart (line chart)
        const trafficCtx = document.getElementById('trafficChart').getContext('2d');
        charts.traffic = new Chart(trafficCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Total Requests',
                        data: [],
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.05)',
                        borderWidth: 2,
                        pointBackgroundColor: '#4e73df',
                        pointRadius: 3,
                        fill: true
                    },
                    {
                        label: 'Bot Requests',
                        data: [],
                        borderColor: '#e74a3b',
                        backgroundColor: 'rgba(231, 74, 59, 0.05)',
                        borderWidth: 2,
                        pointBackgroundColor: '#e74a3b',
                        pointRadius: 3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                tension: 0.3,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
        
        // Traffic pie chart
        const trafficPieCtx = document.getElementById('trafficPieChart').getContext('2d');
        charts.trafficPie = new Chart(trafficPieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Human Traffic', 'Bot Traffic'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#1cc88a', '#e74a3b'],
                    hoverBackgroundColor: ['#17a673', '#e02d1b'],
                    hoverBorderColor: "rgba(234, 236, 244, 1)",
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Detection types chart
        const detectionTypesCtx = document.getElementById('detectionTypesChart').getContext('2d');
        charts.detectionTypes = new Chart(detectionTypesCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Count',
                    data: [],
                    backgroundColor: [
                        'rgba(78, 115, 223, 0.8)',
                        'rgba(28, 200, 138, 0.8)',
                        'rgba(231, 74, 59, 0.8)',
                        'rgba(246, 194, 62, 0.8)',
                        'rgba(54, 185, 204, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
        
        // Request methods chart
        const requestMethodsCtx = document.getElementById('requestMethodsChart').getContext('2d');
        charts.requestMethods = new Chart(requestMethodsCtx, {
            type: 'bar',
            data: {
                labels: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                datasets: [{
                    label: 'Count',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(78, 115, 223, 0.8)',
                        'rgba(28, 200, 138, 0.8)',
                        'rgba(231, 74, 59, 0.8)',
                        'rgba(246, 194, 62, 0.8)',
                        'rgba(54, 185, 204, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'HTTP Methods Distribution'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Response status chart
        const responseStatusCtx = document.getElementById('responseStatusChart').getContext('2d');
        charts.responseStatus = new Chart(responseStatusCtx, {
            type: 'pie',
            data: {
                labels: ['2xx Success', '3xx Redirect', '4xx Client Error', '5xx Server Error'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(28, 200, 138, 0.8)',
                        'rgba(246, 194, 62, 0.8)',
                        'rgba(231, 74, 59, 0.8)',
                        'rgba(78, 115, 223, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Response Status Codes'
                    }
                }
            }
        });
        
        // Response time chart
        const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
        charts.responseTime = new Chart(responseTimeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Avg Response Time (ms)',
                    data: [],
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78, 115, 223, 0.05)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                tension: 0.3,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} ms`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    }
                }
            }
        });
        
        // Initialize the remaining charts
        
        // Mouse movement chart
        const mouseMovementCtx = document.getElementById('mouseMovementChart').getContext('2d');
        charts.mouseMovement = new Chart(mouseMovementCtx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Human Patterns',
                        data: [],
                        backgroundColor: 'rgba(28, 200, 138, 0.5)',
                        pointRadius: 5
                    },
                    {
                        label: 'Bot Patterns',
                        data: [],
                        backgroundColor: 'rgba(231, 74, 59, 0.5)',
                        pointRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Mouse Movement Entropy vs. Speed'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Movement Entropy'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Average Speed (px/ms)'
                        }
                    }
                }
            }
        });
        
        // Scroll behavior chart
        const scrollBehaviorCtx = document.getElementById('scrollBehaviorChart').getContext('2d');
        charts.scrollBehavior = new Chart(scrollBehaviorCtx, {
            type: 'bar',
            data: {
                labels: ['Very Low', 'Low', 'Medium', 'High', 'Very High'],
                datasets: [
                    {
                        label: 'Human',
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(28, 200, 138, 0.8)'
                    },
                    {
                        label: 'Bot',
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(231, 74, 59, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Scroll Variance'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Variance Level'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
        
        // Fingerprint clusters chart
        const fingerprintClustersCtx = document.getElementById('fingerprintClustersChart').getContext('2d');
        charts.fingerprintClusters = new Chart(fingerprintClustersCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Human Count',
                        data: [],
                        backgroundColor: 'rgba(28, 200, 138, 0.8)'
                    },
                    {
                        label: 'Bot Count',
                        data: [],
                        backgroundColor: 'rgba(231, 74, 59, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Browser Fingerprint Clusters'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Cluster ID'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        },
                        stacked: true
                    }
                }
            }
        });
        
        // Session duration chart
        const sessionDurationCtx = document.getElementById('sessionDurationChart').getContext('2d');
        charts.sessionDuration = new Chart(sessionDurationCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Human Sessions',
                        data: [],
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Bot Sessions',
                        data: [],
                        borderColor: '#e74a3b',
                        backgroundColor: 'rgba(231, 74, 59, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} seconds`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Duration (seconds)'
                        }
                    }
                }
            }
        });
        
        // Top countries chart
        const topCountriesCtx = document.getElementById('topCountriesChart').getContext('2d');
        charts.topCountries = new Chart(topCountriesCtx, {
            type: 'horizontalBar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Requests',
                    data: [],
                    backgroundColor: 'rgba(78, 115, 223, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Requests'
                        }
                    }
                }
            }
        });
        
        // Bot by country chart
        const botByCountryCtx = document.getElementById('botByCountryChart').getContext('2d');
        charts.botByCountry = new Chart(botByCountryCtx, {
            type: 'horizontalBar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Bot Percentage',
                    data: [],
                    backgroundColor: 'rgba(231, 74, 59, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.x}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Bot Percentage'
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Fetch all dashboard data from the API
     */
    function fetchDashboardData() {
        // Show loading state
        showLoading(true);
        
        // Promise array for all data fetches
        const promises = [
            fetchStats(),
            fetchDetections(),
            fetchGeomap()
        ];
        
        // Fetch all data concurrently
        Promise.all(promises)
            .then(results => {
                // Handle results
                updateDashboard(results[0], results[1], results[2]);
                showLoading(false);
            })
            .catch(error => {
                console.error('Error fetching dashboard data:', error);
                showLoading(false);
            });
    }
    
    /**
     * Fetch statistics from the API
     */
    function fetchStats() {
        return fetch(`/api/stats/requests?timeRange=${timeRange}`)
            .then(response => response.json())
            .catch(error => {
                console.error('Error fetching request stats:', error);
                return null;
            });
    }
    
    /**
     * Fetch detection events from the API
     */
    function fetchDetections() {
        return fetch('/api/detections')
            .then(response => response.json())
            .catch(error => {
                console.error('Error fetching detections:', error);
                return { detections: [] };
            });
    }
    
    /**
     * Fetch geomap data from the API
     */
    function fetchGeomap() {
        return fetch('/api/geomap')
            .then(response => response.json())
            .catch(error => {
                console.error('Error fetching geomap data:', error);
                return { countries: [] };
            });
    }
    
    /**
     * Update the dashboard with fetched data
     */
    function updateDashboard(stats, detections, geomap) {
        if (stats) {
            updateOverviewStats(stats);
            updateTrafficCharts(stats);
            updateRequestAnalysis(stats);
        }
        
        if (detections && detections.detections) {
            updateDetectionsTables(detections.detections);
            updateDetectionChart(detections.detections);
        }
        
        if (geomap && geomap.countries) {
            updateGeoMap(geomap.countries);
        }
    }
    
    /**
     * Update overview statistics cards
     */
    function updateOverviewStats(stats) {
        document.getElementById('totalRequests').textContent = stats.totalRequests || 0;
        document.getElementById('humanRequests').textContent = stats.humanRequests || 0;
        document.getElementById('botRequests').textContent = stats.botRequests || 0;
        
        const detectionRate = stats.totalRequests > 0 
            ? Math.round((stats.botRequests / stats.totalRequests) * 100) 
            : 0;
        document.getElementById('detectionRate').textContent = `${detectionRate}%`;
    }
    
    /**
     * Update traffic charts
     */
    function updateTrafficCharts(stats) {
        // Update traffic line chart
        if (stats.trafficOverTime) {
            const labels = stats.trafficOverTime.map(item => item.time);
            const totalData = stats.trafficOverTime.map(item => item.total);
            const botData = stats.trafficOverTime.map(item => item.bot);
            
            charts.traffic.data.labels = labels;
            charts.traffic.data.datasets[0].data = totalData;
            charts.traffic.data.datasets[1].data = botData;
            charts.traffic.update();
        }
        
        // Update traffic pie chart
        charts.trafficPie.data.datasets[0].data = [
            stats.humanRequests || 0,
            stats.botRequests || 0
        ];
        charts.trafficPie.update();
    }
    
    /**
     * Update request analysis charts
     */
    function updateRequestAnalysis(stats) {
        // Update methods chart
        if (stats.methodsBreakdown) {
            charts.requestMethods.data.datasets[0].data = [
                stats.methodsBreakdown.GET || 0,
                stats.methodsBreakdown.POST || 0,
                stats.methodsBreakdown.PUT || 0,
                stats.methodsBreakdown.DELETE || 0,
                stats.methodsBreakdown.OPTIONS || 0
            ];
            charts.requestMethods.update();
        }
        
        // Update status codes chart
        if (stats.statusBreakdown) {
            charts.responseStatus.data.datasets[0].data = [
                stats.statusBreakdown['2xx'] || 0,
                stats.statusBreakdown['3xx'] || 0,
                stats.statusBreakdown['4xx'] || 0,
                stats.statusBreakdown['5xx'] || 0
            ];
            charts.responseStatus.update();
        }
        
        // Update response time chart
        if (stats.responseTimeData) {
            charts.responseTime.data.labels = stats.responseTimeData.map(item => item.time);
            charts.responseTime.data.datasets[0].data = stats.responseTimeData.map(item => item.avgTime);
            charts.responseTime.update();
        }
        
        // Update top URLs table
        if (stats.topUrls) {
            const tableBody = document.getElementById('topUrlsTable').querySelector('tbody');
            tableBody.innerHTML = '';
            
            stats.topUrls.forEach(url => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${url.path}</td>
                    <td>${url.count}</td>
                    <td>${url.botPercentage}%</td>
                    <td>${url.avgResponseTime} ms</td>
                `;
                tableBody.appendChild(row);
            });
        }
    }
    
    /**
     * Update detections tables
     */
    function updateDetectionsTables(detections) {
        // Update recent detections table
        const recentTable = document.getElementById('recentDetectionsTable').querySelector('tbody');
        recentTable.innerHTML = '';
        
        // Get the 10 most recent detections
        const recentDetections = detections.slice(0, 10);
        
        recentDetections.forEach(detection => {
            const row = document.createElement('tr');
            const time = new Date(detection.timestamp).toLocaleTimeString();
            
            row.innerHTML = `
                <td>${time}</td>
                <td>${detection.ip}</td>
                <td>${detection.detectionType}</td>
                <td>${Math.round(detection.confidence * 100)}%</td>
            `;
            recentTable.appendChild(row);
        });
        
        // Update full detections table
        const fullTable = document.getElementById('detectionsTable').querySelector('tbody');
        fullTable.innerHTML = '';
        
        detections.forEach((detection, index) => {
            const row = document.createElement('tr');
            row.dataset.id = index;
            row.dataset.confidence = detection.confidence;
            row.dataset.action = detection.actionTaken;
            
            const time = new Date(detection.timestamp).toLocaleString();
            const confidenceClass = detection.confidence >= 0.9 ? 'text-danger fw-bold' : '';
            
            row.innerHTML = `
                <td>${time}</td>
                <td>${detection.ip}</td>
                <td>${detection.sessionId}</td>
                <td>${detection.detectionType}</td>
                <td class="${confidenceClass}">${Math.round(detection.confidence * 100)}%</td>
                <td>${detection.actionTaken}</td>
                <td><button class="btn btn-sm btn-primary view-details">View</button></td>
            `;
            fullTable.appendChild(row);
            
            // Add click handler for details button
            row.querySelector('.view-details').addEventListener('click', () => {
                showDetectionDetails(detection);
            });
        });
    }
    
    /**
     * Update detection types chart
     */
    function updateDetectionChart(detections) {
        // Count detection types
        const typeCounts = {};
        
        detections.forEach(detection => {
            const type = detection.detectionType;
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        // Update chart
        const labels = Object.keys(typeCounts);
        const data = labels.map(label => typeCounts[label]);
        
        charts.detectionTypes.data.labels = labels;
        charts.detectionTypes.data.datasets[0].data = data;
        charts.detectionTypes.update();
    }
    
    /**
     * Update geographic map
     */
    function updateGeoMap(countries) {
        // Update world map (if using jVectorMap)
        // This would require additional implementation
        
        // Update top countries chart
        const topCountries = countries.slice(0, 10);
        
        charts.topCountries.data.labels = topCountries.map(c => c.name);
        charts.topCountries.data.datasets[0].data = topCountries.map(c => c.count);
        charts.topCountries.update();
        
        // Update bot percentage by country
        charts.botByCountry.data.labels = topCountries.map(c => c.name);
        charts.botByCountry.data.datasets[0].data = topCountries.map(c => c.botPercentage);
        charts.botByCountry.update();
    }
    
    /**
     * Filter detections table
     */
    function filterDetectionsTable(filter) {
        const rows = document.querySelectorAll('#detectionsTable tbody tr');
        
        rows.forEach(row => {
            const confidence = parseFloat(row.dataset.confidence);
            const action = row.dataset.action;
            
            if (filter === 'all') {
                row.style.display = '';
            } else if (filter === 'high' && confidence >= 0.9) {
                row.style.display = '';
            } else if (filter === 'blocked' && action.includes('block')) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    /**
     * Show detection details in modal
     */
    function showDetectionDetails(detection) {
        const modal = new bootstrap.Modal(document.getElementById('detectionModal'));
        
        document.getElementById('modalIp').textContent = detection.ip;
        document.getElementById('modalSessionId').textContent = detection.sessionId;
        document.getElementById('modalDetectionType').textContent = detection.detectionType;
        document.getElementById('modalTimestamp').textContent = new Date(detection.timestamp).toLocaleString();
        document.getElementById('modalConfidence').textContent = `${Math.round(detection.confidence * 100)}%`;
        document.getElementById('modalAction').textContent = detection.actionTaken;
        
        // Format evidence as JSON
        const evidenceJson = JSON.stringify(detection.evidence, null, 2);
        document.getElementById('modalEvidence').textContent = evidenceJson;
        
        modal.show();
    }
    
    /**
     * Show or hide loading indicator
     */
    function showLoading(isLoading) {
        // Implementation would depend on your loading indicator UI
        // This is a placeholder
    }
    
    /**
     * Set up real-time updates via Socket.IO
     */
    function setupRealTimeUpdates() {
        // Handle new request events
        socket.on('new-request', (data) => {
            // Update counts in real-time
            const totalRequests = document.getElementById('totalRequests');
            totalRequests.textContent = (parseInt(totalRequests.textContent) || 0) + 1;
            
            if (data.isBot) {
                const botRequests = document.getElementById('botRequests');
                botRequests.textContent = (parseInt(botRequests.textContent) || 0) + 1;
            } else {
                const humanRequests = document.getElementById('humanRequests');
                humanRequests.textContent = (parseInt(humanRequests.textContent) || 0) + 1;
            }
            
            // Update detection rate
            const total = parseInt(document.getElementById('totalRequests').textContent) || 0;
            const bots = parseInt(document.getElementById('botRequests').textContent) || 0;
            const detectionRate = total > 0 ? Math.round((bots / total) * 100) : 0;
            document.getElementById('detectionRate').textContent = `${detectionRate}%`;
        });
        
        // Handle detection events
        socket.on('detection-event', (data) => {
            // Add to recent detections table
            const recentTable = document.getElementById('recentDetectionsTable').querySelector('tbody');
            const row = document.createElement('tr');
            const time = new Date(data.timestamp).toLocaleTimeString();
            
            row.innerHTML = `
                <td>${time}</td>
                <td>${data.ip}</td>
                <td>${data.detectionType}</td>
                <td>${Math.round(data.confidence * 100)}%</td>
            `;
            
            // Add to beginning of table
            if (recentTable.firstChild) {
                recentTable.insertBefore(row, recentTable.firstChild);
            } else {
                recentTable.appendChild(row);
            }
            
            // Remove last row if more than 10
            if (recentTable.children.length > 10) {
                recentTable.removeChild(recentTable.lastChild);
            }
            
            // Add to full detections table
            const fullTable = document.getElementById('detectionsTable').querySelector('tbody');
            const fullRow = document.createElement('tr');
            const fullTime = new Date(data.timestamp).toLocaleString();
            const confidenceClass = data.confidence >= 0.9 ? 'text-danger fw-bold' : '';
            
            fullRow.dataset.confidence = data.confidence;
            fullRow.dataset.action = data.actionTaken;
            
            fullRow.innerHTML = `
                <td>${fullTime}</td>
                <td>${data.ip}</td>
                <td>${data.sessionId}</td>
                <td>${data.detectionType}</td>
                <td class="${confidenceClass}">${Math.round(data.confidence * 100)}%</td>
                <td>${data.actionTaken}</td>
                <td><button class="btn btn-sm btn-primary view-details">View</button></td>
            `;
            
            // Add to beginning of table
            if (fullTable.firstChild) {
                fullTable.insertBefore(fullRow, fullTable.firstChild);
            } else {
                fullTable.appendChild(fullRow);
            }
            
            // Add click handler for details button
            fullRow.querySelector('.view-details').addEventListener('click', () => {
                showDetectionDetails(data);
            });
            
            // Update detection types chart
            updateDetectionChart([...detections, data]);
        });
    }
});
