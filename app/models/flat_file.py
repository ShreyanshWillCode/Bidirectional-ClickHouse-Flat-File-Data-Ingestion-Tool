import pandas as pd
import os

class FlatFileClient:
    def __init__(self, file_path=None, delimiter=','):
        self.file_path = file_path
        self.delimiter = delimiter
        self.data = None

    def set_file_path(self, file_path):
        """Set the file path"""
        self.file_path = file_path
        return True

    def set_delimiter(self, delimiter):
        """Set the delimiter"""
        self.delimiter = delimiter
        return True

    def load_file(self):
        """Load a flat file into memory"""
        try:
            if not os.path.exists(self.file_path):
                return False, f"File not found: {self.file_path}"
                
            self.data = pd.read_csv(self.file_path, delimiter=self.delimiter)
            return True, f"Loaded file with {len(self.data)} rows and {len(self.data.columns)} columns"
        except Exception as e:
            return False, f"Error loading file: {str(e)}"

    def get_columns(self):
        """Get columns from the loaded file"""
        if self.data is None:
            return False, "No file loaded"
        
        columns = [{"name": col, "type": str(self.data[col].dtype)} for col in self.data.columns]
        return True, columns

    def get_preview(self, rows=100):
        """Get a preview of the loaded data"""
        if self.data is None:
            return False, "No file loaded"
        
        preview = self.data.head(rows)
        return True, preview

    def save_to_file(self, df, output_file_path=None, delimiter=None):
        """Save DataFrame to a flat file"""
        try:
            # Use provided parameters or defaults
            output_path = output_file_path or self.file_path
            sep = delimiter or self.delimiter
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            
            # Save to CSV
            df.to_csv(output_path, sep=sep, index=False)
            return True, f"Saved {len(df)} rows to {output_path}"
        except Exception as e:
            return False, f"Error saving file: {str(e)}"

    def select_columns(self, column_names):
        """Select only specified columns from the loaded data"""
        if self.data is None:
            return False, "No file loaded"
        
        try:
            # Filter columns that exist in the DataFrame
            valid_columns = [col for col in column_names if col in self.data.columns]
            
            if not valid_columns:
                return False, "No valid columns specified"
                
            # Create new DataFrame with only selected columns
            filtered_data = self.data[valid_columns]
            return True, filtered_data
        except Exception as e:
            return False, f"Error selecting columns: {str(e)}" 