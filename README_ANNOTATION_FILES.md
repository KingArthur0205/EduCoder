# Annotation Codebook

`EduCoder` loads annotation features and definitions from XLSX or CSV file format.

## File Format Requirements

### XLSX/CSV Format (`MOL Roles Features.xlsx`)

The Excel file should contain separate sheets for each category:
- Each sheet name must match the allowed categories
- Standard Excel column names: `Code`, `Definition`, `Example1`, `Example2`, `NonExample1`, `NonExample2`

| Code   | Definition                      | Example1                         | NonExample1              |
|--------|----------------------------------|----------------------------------|---------------------------|
| `C.1`  | Use of mathematical language     | I added 12 and 18 to get 30.     | 12 + 18 = 30              |
| `D.1`  | Asking a peer for clarification  | What do you mean by "flip it"?  | Can we move on to the next? |
| `E.3`  | Justifying a reasoning step      | Because 4 times 2 is 8, we...    | It just feels right.      |

Each sheet in the XLSX file will be grouped into categories based on its name, and the features will be loaded accordingly.
For CSV files, each file should represent a single category with the same column structure.
