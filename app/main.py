import os
import json
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, send_from_directory
)
from werkzeug.utils import secure_filename
from .models.clickhouse_client import ClickHouseClient
from .models.flat_file import FlatFileClient
import pandas as pd

bp = Blueprint('main', __name__)

# Define path for file uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@bp.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@bp.route('/api/clickhouse/connect', methods=['POST'])
def connect_clickhouse():
    """Connect to ClickHouse database"""
    data = request.json
    host = data.get('host')
    port = int(data.get('port'))
    database = data.get('database')
    user = data.get('user')
    jwt_token = data.get('jwt_token')
    password = data.get('password')
    
    # Create ClickHouse client
    client = ClickHouseClient(
        host,
        port,
        database,
        user,
        jwt_token=jwt_token,
        password=password
    )
    success, message = client.connect()
    
    if success:
        # Store connection in session
        session['clickhouse'] = {
            'host': host,
            'port': port,
            'database': database,
            'user': user,
            'jwt_token': jwt_token,
            'password': password
        }
        
        # Get tables
        success, tables = client.get_tables()
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'tables': tables
            })
    
    return jsonify({
        'success': False,
        'message': message
    })

@bp.route('/api/clickhouse/tables/<table_name>/columns', methods=['GET'])
def get_clickhouse_columns(table_name):
    """Get columns for a ClickHouse table"""
    if 'clickhouse' not in session:
        return jsonify({
            'success': False,
            'message': 'Not connected to ClickHouse'
        })
    
    conn = session['clickhouse']
    client = ClickHouseClient(
        conn['host'], conn['port'], conn['database'], 
        conn['user'], conn['jwt_token'],
        password=conn.get('password')
    )
    
    success, message = client.connect()
    if not success:
        return jsonify({
            'success': False,
            'message': message
        })
    
    success, columns = client.get_table_columns(table_name)
    if success:
        return jsonify({
            'success': True,
            'columns': columns
        })
    
    return jsonify({
        'success': False,
        'message': message
    })

@bp.route('/api/clickhouse/preview', methods=['POST'])
def preview_clickhouse_data():
    """Preview data from ClickHouse"""
    if 'clickhouse' not in session:
        return jsonify({
            'success': False,
            'message': 'Not connected to ClickHouse'
        })
    
    data = request.json
    table_name = data.get('table')
    selected_columns = data.get('columns', [])
    limit = data.get('limit', 100)
    
    conn = session['clickhouse']
    client = ClickHouseClient(
        conn['host'], conn['port'], conn['database'], 
        conn['user'], conn['jwt_token'],
        password=conn.get('password')
    )
    
    success, message = client.connect()
    if not success:
        return jsonify({
            'success': False,
            'message': message
        })
    
    # Build query
    columns_str = ', '.join(selected_columns) if selected_columns else '*'
    query = f"SELECT {columns_str} FROM {table_name} LIMIT {limit}"
    
    success, result = client.execute_query(query, with_column_types=True)
    if success:
        # Convert to list of dicts for JSON serialization
        rows = []
        for row in result['data']:
            rows.append(dict(zip(result['columns'], row)))
        
        return jsonify({
            'success': True,
            'data': rows,
            'columns': result['columns']
        })
    
    return jsonify({
        'success': False,
        'message': result
    })

@bp.route('/api/flatfile/upload', methods=['POST'])
def upload_flat_file():
    """Upload a flat file"""
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'message': 'No file part'
        })
        
    file = request.files['file']
    delimiter = request.form.get('delimiter', ',')
    
    if file.filename == '':
        return jsonify({
            'success': False,
            'message': 'No selected file'
        })
        
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Store file info in session
        session['flat_file'] = {
            'path': file_path,
            'delimiter': delimiter
        }
        
        # Load file to get columns
        client = FlatFileClient(file_path, delimiter)
        success, message = client.load_file()
        
        if success:
            success, columns = client.get_columns()
            if success:
                return jsonify({
                    'success': True,
                    'message': message,
                    'columns': columns
                })
        
        return jsonify({
            'success': False,
            'message': message
        })

@bp.route('/api/flatfile/preview', methods=['POST'])
def preview_flat_file():
    """Preview data from a flat file"""
    if 'flat_file' not in session:
        return jsonify({
            'success': False,
            'message': 'No file uploaded'
        })
        
    data = request.json
    selected_columns = data.get('columns', [])
    limit = data.get('limit', 100)
    
    file_info = session['flat_file']
    client = FlatFileClient(file_info['path'], file_info['delimiter'])
    
    success, message = client.load_file()
    if not success:
        return jsonify({
            'success': False,
            'message': message
        })
    
    # Get selected columns
    if selected_columns:
        success, df = client.select_columns(selected_columns)
        if not success:
            return jsonify({
                'success': False,
                'message': df
            })
    else:
        df = client.data
    
    # Get preview
    preview = df.head(limit).to_dict('records')
    columns = df.columns.tolist()
    
    return jsonify({
        'success': True,
        'data': preview,
        'columns': columns
    })

@bp.route('/api/ingest/clickhouse-to-flatfile', methods=['POST'])
def ingest_clickhouse_to_flatfile():
    """Ingest data from ClickHouse to flat file"""
    if 'clickhouse' not in session:
        return jsonify({
            'success': False,
            'message': 'Not connected to ClickHouse'
        })
        
    data = request.json
    table_name = data.get('table')
    selected_columns = data.get('columns', [])
    output_file = data.get('output_file')
    delimiter = data.get('delimiter', ',')
    
    # Validate required fields
    if not table_name or not output_file:
        return jsonify({
            'success': False,
            'message': 'Missing required fields: table_name, output_file'
        })
    
    # Connect to ClickHouse
    conn = session['clickhouse']
    client = ClickHouseClient(
        conn['host'], conn['port'], conn['database'], 
        conn['user'], conn['jwt_token'],
        password=conn.get('password')
    )
    
    success, message = client.connect()
    if not success:
        return jsonify({
            'success': False,
            'message': message
        })
    
    # Build query
    columns_str = ', '.join(selected_columns) if selected_columns else '*'
    query = f"SELECT {columns_str} FROM {table_name}"
    
    # Execute query and get DataFrame
    success, df = client.query_to_dataframe(query)
    if not success:
        return jsonify({
            'success': False,
            'message': df
        })
    
    # Ensure output_file has the correct extension
    if not output_file.endswith('.csv'):
        output_file += '.csv'
    
    # Save to flat file
    output_path = os.path.join(UPLOAD_FOLDER, secure_filename(output_file))
    flat_file = FlatFileClient()
    success, message = flat_file.save_to_file(df, output_path, delimiter)
    
    if success:
        return jsonify({
            'success': True,
            'message': message,
            'record_count': len(df)
        })
    
    return jsonify({
        'success': False,
        'message': message
    })

@bp.route('/api/ingest/flatfile-to-clickhouse', methods=['POST'])
def ingest_flatfile_to_clickhouse():
    """Ingest data from flat file to ClickHouse"""
    if 'flat_file' not in session:
        return jsonify({
            'success': False,
            'message': 'No file uploaded'
        })
        
    if 'clickhouse' not in session:
        return jsonify({
            'success': False,
            'message': 'Not connected to ClickHouse'
        })
    
    data = request.json
    selected_columns = data.get('columns', [])
    target_table = data.get('target_table')
    
    # Validate required fields
    if not target_table:
        return jsonify({
            'success': False,
            'message': 'Missing required field: target_table'
        })
    
    # Load flat file
    file_info = session['flat_file']
    flat_file = FlatFileClient(file_info['path'], file_info['delimiter'])
    
    success, message = flat_file.load_file()
    if not success:
        return jsonify({
            'success': False,
            'message': message
        })
    
    # Get selected columns
    if selected_columns:
        success, df = flat_file.select_columns(selected_columns)
        if not success:
            return jsonify({
                'success': False,
                'message': df
            })
    else:
        df = flat_file.data
    
    # Map pandas datatypes to ClickHouse datatypes
    def map_dtype_to_clickhouse(dtype):
        if pd.api.types.is_integer_dtype(dtype):
            return 'Int64'
        elif pd.api.types.is_float_dtype(dtype):
            return 'Float64'
        elif pd.api.types.is_datetime64_dtype(dtype):
            return 'DateTime'
        else:
            return 'String'
    
    column_types = {col: map_dtype_to_clickhouse(df[col].dtype) for col in df.columns}
    
    # Connect to ClickHouse
    conn = session['clickhouse']
    client = ClickHouseClient(
        conn['host'], conn['port'], conn['database'], 
        conn['user'], conn['jwt_token'],
        password=conn.get('password')
    )
    
    success, message = client.connect()
    if not success:
        return jsonify({
            'success': False,
            'message': message
        })
    
    # Insert data into ClickHouse
    success, result = client.dataframe_to_clickhouse(df, target_table, column_types)
    
    if success:
        return jsonify({
            'success': True,
            'message': f"Successfully ingested data to {target_table}",
            'record_count': result
        })
    
    return jsonify({
        'success': False,
        'message': result
    })

@bp.route('/api/files/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download a file from the uploads directory"""
    secure_name = secure_filename(filename)
    file_path = os.path.join(UPLOAD_FOLDER, secure_name)
    
    if not os.path.exists(file_path):
        return jsonify({
            'success': False,
            'message': f'File not found: {secure_name}'
        }), 404
        
    return send_from_directory(
        UPLOAD_FOLDER,
        secure_name,
        as_attachment=True
    ) 