# Transcript Upload Feature

## Overview

EduCoder now includes a feature to upload new transcript files via Excel (.xlsx or .xls) files. This feature allows users to add new transcripts to the system without manual file placement.

## How to Use

### 1. Access the Upload Feature

1. Navigate to the main page of EduCoder
2. Click the green "Add New Transcript" button
3. The upload interface will appear below the button

### 2. Upload a Transcript File

You can upload files in two ways:
- **Drag and Drop**: Drag an Excel file directly onto the upload area
- **Click to Select**: Click the "Select Excel File" button to choose a file from your computer

### 3. File Requirements

## Example Excel File Format

| #  | Speaker   | Dialogue                                 | Selectable | Segment |
|----|-----------|------------------------------------------|------------|---------|
| 1  | Teacher   | Hello everyone, welcome to class.        | no         | a       |
| 2  | Student 1 | Hi teacher!                              | yes        | a       |
| 3  | Student 2 | Good morning!                            | yes        | a       |
The uploaded Excel file must contain the following **required columns**:
- `#` - Line number or sequence number
- `Speaker` - Name of the person speaking
- `Dialogue` - The spoken content

**Additional columns are allowed** and will be preserved in the CSV output.
- `Selectable` - Indicates if the row can be annotated
- `Segment` - Help organize the dialogue into segments

### 4. File Validation

The system will validate:
- File format (must be .xlsx or .xls)
- File size (must be less than 10MB)
- Presence of required columns
- At least one valid data row
- Non-empty Speaker and Dialogue values

### 5. What Happens After Upload

Upon successful upload:
1. A new transcript folder is created with a unique ID (e.g., `t001`)
2. The Excel file is converted to CSV format
3. A `speakers.json` file is generated with color assignments for each unique speaker
4. The original Excel file is preserved
5. You are automatically redirected to the new transcript page

## File Structure Created

For each uploaded transcript, the following structure is created in the `public` folder:

```
public/
└── t{id}/
    ├── transcript.csv          # Converted CSV file
    ├── transcript.xlsx         # Original Excel file
    └── speakers.json           # Speaker color assignments
```

## Speaker Color Assignment

The system automatically assigns colors to speakers using a predefined color palette:
- `bg-red-200`, `bg-blue-200`, `bg-green-200`, `bg-yellow-200`
- `bg-purple-200`, `bg-pink-200`, `bg-indigo-200`, `bg-gray-200`
- `bg-orange-200`, `bg-teal-200`, `bg-cyan-200`, `bg-lime-200`

Colors are assigned in order, cycling through the palette if there are more speakers than colors.
