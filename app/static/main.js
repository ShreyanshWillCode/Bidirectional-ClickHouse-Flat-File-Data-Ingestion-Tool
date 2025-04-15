document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const sourceTypeRadios = document.querySelectorAll('input[name="sourceType"]');
    const targetTypeRadios = document.querySelectorAll('input[name="targetType"]');
    
    // Source containers
    const clickhouseSourceContainer = document.getElementById('clickhouseSource');
    const flatfileSourceContainer = document.getElementById('flatfileSource');
    
    // Target containers
    const clickhouseTargetContainer = document.getElementById('clickhouseTarget');
    const flatfileTargetContainer = document.getElementById('flatfileTarget');
    
    // ClickHouse source elements
    const clickhouseConnect = document.getElementById('clickhouseConnect');
    const clickhouseTableSelection = document.getElementById('clickhouseTableSelection');
    const clickhouseTables = document.getElementById('clickhouseTables');
    const clickhouseLoadColumns = document.getElementById('clickhouseLoadColumns');
    const clickhouseColumnSelection = document.getElementById('clickhouseColumnSelection');
    const clickhouseColumns = document.getElementById('clickhouseColumns');
    const clickhouseSelectAll = document.getElementById('clickhouseSelectAll');
    const clickhouseUnselectAll = document.getElementById('clickhouseUnselectAll');
    const clickhousePreview = document.getElementById('clickhousePreview');
    
    // Flat file source elements
    const flatFileUpload = document.getElementById('flatFileUpload');
    const flatFileDelimiter = document.getElementById('flatFileDelimiter');
    const flatFileUploadBtn = document.getElementById('flatFileUploadBtn');
    const flatFileColumnSelection = document.getElementById('flatFileColumnSelection');
    const flatFileColumns = document.getElementById('flatFileColumns');
    const flatFileSelectAll = document.getElementById('flatFileSelectAll');
    const flatFileUnselectAll = document.getElementById('flatFileUnselectAll');
    const flatFilePreview = document.getElementById('flatFilePreview');
    
    // Ingestion elements
    const startIngestion = document.getElementById('startIngestion');
    const ingestionStatus = document.getElementById('ingestionStatus');
    const progressContainer = document.getElementById('progressContainer');
    const ingestionProgress = document.getElementById('ingestionProgress');
    const ingestionResult = document.getElementById('ingestionResult');
    const recordCount = document.getElementById('recordCount');
    
    // Preview modal elements
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    const previewHeader = document.getElementById('previewHeader');
    const previewBody = document.getElementById('previewBody');
    
    // Event Listeners
    
    // Source type selection
    sourceTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'clickhouse') {
                clickhouseSourceContainer.classList.remove('hidden');
                flatfileSourceContainer.classList.add('hidden');
            } else {
                clickhouseSourceContainer.classList.add('hidden');
                flatfileSourceContainer.classList.remove('hidden');
            }
        });
    });
    
    // Target type selection
    targetTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'clickhouse') {
                clickhouseTargetContainer.classList.remove('hidden');
                flatfileTargetContainer.classList.add('hidden');
            } else {
                clickhouseTargetContainer.classList.add('hidden');
                flatfileTargetContainer.classList.remove('hidden');
            }
        });
    });
    
    // ClickHouse connection
    clickhouseConnect.addEventListener('click', function() {
        const host = document.getElementById('clickhouseHost').value;
        const port = document.getElementById('clickhousePort').value;
        const database = document.getElementById('clickhouseDatabase').value;
        const user = document.getElementById('clickhouseUser').value;
        const jwtToken = document.getElementById('clickhouseJwtToken').value;
        
        // Validation
        if (!host || !port || !database || !user) {
            showAlert('Please fill in all required fields', 'danger');
            return;
        }
        
        showStatus('Connecting to ClickHouse...', 'info');
        
        // Send connection request
        fetch('/api/clickhouse/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                host,
                port,
                database,
                user,
                jwt_token: jwtToken,
                password: document.getElementById('clickhousePassword').value
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showStatus('Connected to ClickHouse', 'success');
                
                // Populate table dropdown
                clickhouseTables.innerHTML = '';
                data.tables.forEach(table => {
                    const option = document.createElement('option');
                    option.value = table;
                    option.textContent = table;
                    clickhouseTables.appendChild(option);
                });
                
                // Show table selection
                clickhouseTableSelection.classList.remove('hidden');
            } else {
                showStatus(`Connection failed: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            showStatus(`Error: ${error.message}`, 'danger');
        });
    });
    
    // Load columns for selected ClickHouse table
    clickhouseLoadColumns.addEventListener('click', function() {
        const selectedTable = clickhouseTables.value;
        
        if (!selectedTable) {
            showAlert('Please select a table', 'warning');
            return;
        }
        
        showStatus('Loading columns...', 'info');
        
        // Fetch columns
        fetch(`/api/clickhouse/tables/${selectedTable}/columns`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Populate columns checkboxes
                clickhouseColumns.innerHTML = '';
                data.columns.forEach(column => {
                    const div = document.createElement('div');
                    div.className = 'form-check';
                    
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.className = 'form-check-input clickhouse-column';
                    input.id = `clickhouse-column-${column.name}`;
                    input.value = column.name;
                    input.checked = true;
                    
                    const label = document.createElement('label');
                    label.className = 'form-check-label';
                    label.htmlFor = `clickhouse-column-${column.name}`;
                    label.textContent = `${column.name} (${column.type})`;
                    
                    div.appendChild(input);
                    div.appendChild(label);
                    clickhouseColumns.appendChild(div);
                });
                
                // Show column selection
                clickhouseColumnSelection.classList.remove('hidden');
                showStatus('', '');
            } else {
                showStatus(`Failed to load columns: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            showStatus(`Error: ${error.message}`, 'danger');
        });
    });
    
    // ClickHouse select/unselect all columns
    clickhouseSelectAll.addEventListener('click', function() {
        document.querySelectorAll('.clickhouse-column').forEach(checkbox => {
            checkbox.checked = true;
        });
    });
    
    clickhouseUnselectAll.addEventListener('click', function() {
        document.querySelectorAll('.clickhouse-column').forEach(checkbox => {
            checkbox.checked = false;
        });
    });
    
    // Preview ClickHouse data
    clickhousePreview.addEventListener('click', function() {
        const selectedTable = clickhouseTables.value;
        
        // Get selected columns
        const selectedColumns = Array.from(document.querySelectorAll('.clickhouse-column:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedColumns.length === 0) {
            showAlert('Please select at least one column', 'warning');
            return;
        }
        
        showStatus('Loading preview...', 'info');
        
        // Fetch preview data
        fetch('/api/clickhouse/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: selectedTable,
                columns: selectedColumns,
                limit: 100
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Populate preview modal
                showDataPreview(data.columns, data.data);
                showStatus('', '');
            } else {
                showStatus(`Failed to load preview: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            showStatus(`Error: ${error.message}`, 'danger');
        });
    });
    
    // Flat file upload
    flatFileUploadBtn.addEventListener('click', function() {
        const file = flatFileUpload.files[0];
        const delimiter = flatFileDelimiter.value;
        
        if (!file) {
            showAlert('Please select a file', 'warning');
            return;
        }
        
        showStatus('Uploading file...', 'info');
        
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('delimiter', delimiter);
        
        // Upload file
        fetch('/api/flatfile/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showStatus(`File uploaded: ${data.message}`, 'success');
                
                // Populate columns checkboxes
                flatFileColumns.innerHTML = '';
                data.columns.forEach(column => {
                    const div = document.createElement('div');
                    div.className = 'form-check';
                    
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.className = 'form-check-input flat-file-column';
                    input.id = `flat-file-column-${column.name}`;
                    input.value = column.name;
                    input.checked = true;
                    
                    const label = document.createElement('label');
                    label.className = 'form-check-label';
                    label.htmlFor = `flat-file-column-${column.name}`;
                    label.textContent = `${column.name} (${column.type})`;
                    
                    div.appendChild(input);
                    div.appendChild(label);
                    flatFileColumns.appendChild(div);
                });
                
                // Show column selection
                flatFileColumnSelection.classList.remove('hidden');
            } else {
                showStatus(`File upload failed: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            showStatus(`Error: ${error.message}`, 'danger');
        });
    });
    
    // Flat file select/unselect all columns
    flatFileSelectAll.addEventListener('click', function() {
        document.querySelectorAll('.flat-file-column').forEach(checkbox => {
            checkbox.checked = true;
        });
    });
    
    flatFileUnselectAll.addEventListener('click', function() {
        document.querySelectorAll('.flat-file-column').forEach(checkbox => {
            checkbox.checked = false;
        });
    });
    
    // Preview flat file data
    flatFilePreview.addEventListener('click', function() {
        // Get selected columns
        const selectedColumns = Array.from(document.querySelectorAll('.flat-file-column:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedColumns.length === 0) {
            showAlert('Please select at least one column', 'warning');
            return;
        }
        
        showStatus('Loading preview...', 'info');
        
        // Fetch preview data
        fetch('/api/flatfile/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                columns: selectedColumns,
                limit: 100
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Populate preview modal
                showDataPreview(data.columns, data.data);
                showStatus('', '');
            } else {
                showStatus(`Failed to load preview: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            showStatus(`Error: ${error.message}`, 'danger');
        });
    });
    
    // Start ingestion
    startIngestion.addEventListener('click', function() {
        // Get source and target types
        const sourceType = document.querySelector('input[name="sourceType"]:checked').value;
        const targetType = document.querySelector('input[name="targetType"]:checked').value;
        
        // Validate bidirectional flow
        if (sourceType === targetType) {
            showAlert('Source and target must be different', 'warning');
            return;
        }
        
        showStatus('Preparing ingestion...', 'info');
        showProgressBar(20);
        
        let apiEndpoint, requestData;
        
        // ClickHouse to Flat File
        if (sourceType === 'clickhouse' && targetType === 'flatfile') {
            const selectedTable = clickhouseTables.value;
            const selectedColumns = Array.from(document.querySelectorAll('.clickhouse-column:checked'))
                .map(checkbox => checkbox.value);
            const outputFile = document.getElementById('flatFileTargetName').value;
            const delimiter = document.getElementById('flatFileTargetDelimiter').value;
            
            // Validation
            if (!selectedTable || selectedColumns.length === 0 || !outputFile) {
                showAlert('Please fill in all required fields and select at least one column', 'warning');
                hideProgressBar();
                return;
            }
            
            apiEndpoint = '/api/ingest/clickhouse-to-flatfile';
            requestData = {
                table: selectedTable,
                columns: selectedColumns,
                output_file: outputFile,
                delimiter: delimiter
            };
        }
        // Flat File to ClickHouse
        else if (sourceType === 'flatfile' && targetType === 'clickhouse') {
            const selectedColumns = Array.from(document.querySelectorAll('.flat-file-column:checked'))
                .map(checkbox => checkbox.value);
            const targetTable = document.getElementById('clickhouseTargetTable').value;
            
            // Validation
            if (selectedColumns.length === 0 || !targetTable) {
                showAlert('Please fill in all required fields and select at least one column', 'warning');
                hideProgressBar();
                return;
            }
            
            apiEndpoint = '/api/ingest/flatfile-to-clickhouse';
            requestData = {
                columns: selectedColumns,
                target_table: targetTable
            };
        }
        
        // Start ingestion
        showStatus('Ingesting data...', 'info');
        showProgressBar(50);
        
        fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            showProgressBar(100);
            
            if (data.success) {
                showStatus('Ingestion completed successfully', 'success');
                
                // Show record count
                recordCount.textContent = `Successfully processed ${data.record_count} records`;
                ingestionResult.classList.remove('hidden');
                
                // Add download button for ClickHouse to Flat File transfer
                if (sourceType === 'clickhouse' && targetType === 'flatfile') {
                    const outputFile = document.getElementById('flatFileTargetName').value;
                    const fileName = outputFile.endsWith('.csv') ? outputFile : outputFile + '.csv';
                    
                    const downloadLink = document.getElementById('downloadLink');
                    downloadLink.href = `/api/files/download/${fileName}`;
                    
                    // Show download section
                    document.getElementById('downloadSection').classList.remove('hidden');
                }
            } else {
                showStatus(`Ingestion failed: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            hideProgressBar();
            showStatus(`Error: ${error.message}`, 'danger');
        });
    });
    
    // Helper functions
    
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.querySelector('.container').prepend(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                alertDiv.remove();
            }, 150);
        }, 5000);
    }
    
    function showStatus(message, type) {
        if (message) {
            ingestionStatus.textContent = message;
            ingestionStatus.className = `alert alert-${type}`;
            ingestionStatus.classList.remove('hidden');
        } else {
            ingestionStatus.classList.add('hidden');
        }
    }
    
    function showProgressBar(percent) {
        progressContainer.classList.remove('hidden');
        ingestionProgress.style.width = `${percent}%`;
        ingestionProgress.setAttribute('aria-valuenow', percent);
        ingestionProgress.textContent = `${percent}%`;
    }
    
    function hideProgressBar() {
        progressContainer.classList.add('hidden');
    }
    
    function showDataPreview(columns, data) {
        // Clear previous data
        previewHeader.innerHTML = '';
        previewBody.innerHTML = '';
        
        // Add headers
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            previewHeader.appendChild(th);
        });
        
        // Add rows
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = row[column] !== null ? row[column] : '';
                tr.appendChild(td);
            });
            
            previewBody.appendChild(tr);
        });
        
        // Show modal
        previewModal.show();
    }
}); 