# ClickHouse & Flat File Data Ingestion Tool - Setup Guide

## Step 1: Install Dependencies

First, ensure you have the required dependencies installed. Run:

```
pip install Flask==2.0.1 clickhouse-driver==0.2.0 pandas==1.3.3 python-dotenv==0.19.0 pyjwt==2.1.0 Werkzeug==2.0.1
```

If you encounter timeout issues or other network problems when installing, you can try:

1. Using a different package index:
```
pip install -r requirements.txt --index-url https://pypi.org/simple/
```

2. Installing packages one by one:
```
pip install Flask==2.0.1
pip install clickhouse-driver==0.2.0
pip install pandas==1.3.3
pip install python-dotenv==0.19.0
pip install pyjwt==2.1.0
pip install Werkzeug==2.0.1
```

3. Using a different network or adding longer timeout:
```
pip install -r requirements.txt --timeout 120
```

## Step 2: Setting Up ClickHouse for Testing

For testing this application, you'll need a ClickHouse instance. You can:

1. Install ClickHouse locally using Docker:
```
docker run -d --name clickhouse-server -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server
```

2. Use a cloud-based ClickHouse service (such as ClickHouse Cloud)

3. Load example datasets for testing:
   - Visit: https://clickhouse.com/docs/getting-started/example-datasets
   - Follow instructions for loading uk_price_paid or ontime datasets

## Step 3: Running the Application

Once dependencies are installed, run the application:

```
python app.py
```

This will start the Flask development server on http://localhost:5000

## Step 4: Using the Application

1. Open your browser and navigate to http://localhost:5000
2. Follow the usage instructions in the README.md file

## Troubleshooting

If you encounter issues:

1. Ensure all dependencies are correctly installed
2. Check if the ClickHouse server is accessible
3. Verify that you have proper permissions for file operations
4. Check that the JWT token is valid when connecting to ClickHouse

## Running in Production

For production environments, consider:

1. Using a production WSGI server like Gunicorn:
```
pip install gunicorn
gunicorn app:app
```

2. Setting up proper security measures (HTTPS, proper JWT handling)
3. Configuring proper file storage mechanisms
4. Adding more robust error handling and logging

## Additional Notes

- The app creates an 'uploads' folder to store files
- JWT tokens must be correctly formatted according to ClickHouse requirements
- Adjust the application for your specific ClickHouse server configuration 