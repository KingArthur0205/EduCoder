#!/usr/bin/env python3
"""
Script to update transcript CSV file with selectable column.
Marks rows as selectable="yes" if speaker (lowercase) contains "student".
"""

import pandas as pd
import os

def update_transcript_csv():
    """
    Read transcript.csv and update the selectable column based on speaker content.
    """
    csv_file = "transcript.csv"
    
    # Check if file exists
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found in the current directory")
        return
    
    try:
        # Read the CSV file
        df = pd.read_csv(csv_file)
        print(f"Loaded {len(df)} rows from {csv_file}")
        
        # Check if speaker column exists
        if 'Speaker' not in df.columns:
            print("Error: 'speaker' column not found in CSV file")
            print(f"Available columns: {list(df.columns)}")
            return
        
        # Create or update the selectable column
        df['selectable'] = df['Speaker'].astype(str).str.lower().apply(
            lambda x: 'yes' if 'student' in x else 'no'
        )
        
        # Count how many rows were marked as selectable
        selectable_count = (df['selectable'] == 'yes').sum()
        print(f"Marked {selectable_count} rows as selectable (speaker contains 'student')")
        
        # Save the updated CSV
        df.to_csv(csv_file, index=False)
        print(f"Updated {csv_file} successfully")
        
        # Show summary
        print(f"\nSummary:")
        print(f"Total rows: {len(df)}")
        print(f"Selectable rows: {selectable_count}")
        print(f"Non-selectable rows: {len(df) - selectable_count}")
        
    except Exception as e:
        print(f"Error processing CSV file: {e}")

if __name__ == "__main__":
    update_transcript_csv()