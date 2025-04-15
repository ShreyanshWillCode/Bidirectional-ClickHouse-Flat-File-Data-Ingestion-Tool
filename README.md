# ClickHouse & Flat File Data Ingestion Tool

A web-based application for bidirectional data ingestion between ClickHouse databases and flat files.

## Features

- Bidirectional data flow:
  - ClickHouse to Flat File
  - Flat File to ClickHouse
- JWT token-based authentication for ClickHouse
- Column selection for ingestion
- Data preview
- Record count reporting
- Progress tracking

## Requirements

- Python 3.7+
- Flask
- clickhouse-driver
- pandas
- Other dependencies listed in requirements.txt

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/clickhouse-flat-file-tool.git
cd clickhouse-flat-file-tool
```

2. Create a virtual environment (optional but recommended):
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```
pip install -r requirements.txt
```

## Running the Application

1. Start the Flask application:
```
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

### ClickHouse to Flat File

1. Select "ClickHouse" as the source and "Flat File" as the target
2. Enter ClickHouse connection details (Host, Port, Database, User, JWT Token)
3. Click "Connect" to establish connection
4. Select a table from the dropdown
5. Click "Load Columns" to view available columns
6. Select columns to ingest
7. (Optional) Click "Preview Data" to see a sample
8. Enter output file name and delimiter for the flat file
9. Click "Start Ingestion" to begin the data transfer
10. View the results including record count

### Flat File to ClickHouse

1. Select "Flat File" as the source and "ClickHouse" as the target
2. Upload a flat file and specify its delimiter
3. Select columns to ingest
4. (Optional) Click "Preview Data" to see a sample
5. Enter ClickHouse connection details if not already connected
6. Enter target table name in ClickHouse
7. Click "Start Ingestion" to begin the data transfer
8. View the results including record count

## Testing

The application can be tested with example ClickHouse datasets:
- uk_price_paid
- ontime

For more information on these datasets, visit:
https://clickhouse.com/docs/getting-started/example-datasets

## Project Structure

```
clickhouse-flat-file-tool/
│
├── app/                    # Application package
│   ├── __init__.py         # Flask app initialization
│   ├── main.py             # Main routes & API endpoints
│   ├── models/             # Data models
│   │   ├── clickhouse_client.py  # ClickHouse client
│   │   └── flat_file.py    # Flat file handling
│   ├── static/             # Static assets
│   │   └── main.js         # Frontend JavaScript
│   ├── templates/          # HTML templates
│   │   └── index.html      # Main UI
│   └── uploads/            # Directory for uploaded files
│
├── app.py                  # Application entry point
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Notes

- The application creates a directory `app/uploads` to store uploaded and generated files
- For ClickHouse JWT authentication, provide a valid JWT token
- When ingesting to ClickHouse, tables will be created if they don't exist 