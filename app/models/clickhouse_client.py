from clickhouse_driver import Client
import pandas as pd
import jwt

class ClickHouseClient:
    def __init__(self, host, port, database, user, jwt_token=None, password=None):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.jwt_token = jwt_token
        self.password = password
        self.client = None

    def connect(self):
        """Connect to ClickHouse using JWT token if provided"""
        try:
            settings = {'use_numpy': True}
            
            # Connect with JWT token if provided
            if self.jwt_token:
                settings['jwt'] = self.jwt_token
            
            # Create connection parameters
            connection_params = {
                'host': self.host,
                'port': self.port, 
                'database': self.database,
                'user': self.user,
                'settings': settings,
                'secure': True,
                'verify': True
            }
            
            # Add password only if it's not None
            if self.password:
                connection_params['password'] = self.password
            
            self.client = Client(**connection_params)
            
            # Test connection
            self.client.execute('SELECT 1')
            return True, "Connected successfully"
        except Exception as e:
            return False, f"Connection error: {str(e)}"

    def get_tables(self):
        """Get list of tables in the database"""
        try:
            query = "SHOW TABLES FROM {}".format(self.database)
            tables = self.client.execute(query)
            return True, [table[0] for table in tables]
        except Exception as e:
            return False, f"Error fetching tables: {str(e)}"

    def get_table_columns(self, table_name):
        """Get columns for a specific table"""
        try:
            query = f"DESCRIBE TABLE {table_name}"
            columns = self.client.execute(query)
            return True, [{"name": col[0], "type": col[1]} for col in columns]
        except Exception as e:
            return False, f"Error fetching columns: {str(e)}"

    def execute_query(self, query, with_column_types=False):
        """Execute a query and return results"""
        try:
            if with_column_types:
                result, columns = self.client.execute(query, with_column_types=True)
                column_names = [col[0] for col in columns]
                return True, {"data": result, "columns": column_names}
            else:
                result = self.client.execute(query)
                return True, result
        except Exception as e:
            return False, f"Query error: {str(e)}"

    def query_to_dataframe(self, query):
        """Execute a query and return results as a pandas DataFrame"""
        try:
            success, result = self.execute_query(query, with_column_types=True)
            if success:
                df = pd.DataFrame(result["data"], columns=result["columns"])
                return True, df
            else:
                return False, result
        except Exception as e:
            return False, f"DataFrame conversion error: {str(e)}"

    def dataframe_to_clickhouse(self, df, target_table, column_types=None):
        """Insert pandas DataFrame into ClickHouse table"""
        try:
            # Create table if doesn't exist and column_types is provided
            if column_types:
                create_table_query = f"CREATE TABLE IF NOT EXISTS {target_table} ("
                create_table_query += ", ".join([f"{col} {type}" for col, type in column_types.items()])
                create_table_query += ") ENGINE = MergeTree() ORDER BY tuple()"
                
                success, result = self.execute_query(create_table_query)
                if not success:
                    return False, result
            
            # For columnar=True, we need to convert to column-oriented format
            # Convert DataFrame to dictionary of columns
            columns = df.columns.tolist()
            data = {col: df[col].tolist() for col in columns}
            
            # Create INSERT query
            insert_query = f"INSERT INTO {target_table} ({', '.join(columns)}) VALUES"
            
            # Execute insert with columnar=True
            self.client.execute(insert_query, data, columnar=True)
            return True, len(df)
        except Exception as e:
            return False, f"Data ingestion error: {str(e)}" 