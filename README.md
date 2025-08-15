<p align="center">
  <img src="https://github.com/KingArthur0205/EduCoder/blob/main/figures/Icon.png" alt="EduCoder Icon" width="150"/>
</p>

# EduCoder: An Open-Source Annotation System for Education Transcript Data
**EduCoder** is an open-source user interface(UI) designed to facilitate the annotation of educational conversation transcript.
It provides a practical and efficient interface for essential annotation tasks such as customisablee feature codebook, LLM-based reference annotation, and real-time cross-annotator IRR analysis to meet the needs of researchers and teachers.
This toolkit aims to enhance the accessibility and efficiency of educational conversation transcript annotation, as well as advance both natural language processing (NLP) and education research.
By simplifying these key operations, the UI supports the efficient exploration of text data annotation in education.

The publication on EduCoder will be linked here once available: [Coming Soon].

## Overview of the `EduCoder` Pipeline
The `EduCoder` pipeline consists of three steps: `data preparation`, `annotation`, and `analysis`. The pipeline is designed to be minimalistic so you can easily use by converting the data to the `EduCoder` format specified below.
<p align="center">
  <img src="https://github.com/KingArthur0205/EduCoder/blob/main/figures/Pipeline.png"/>
</p>


## 📖 Table of Contents
[**Installation**](#installation) | [**Tutorials**](#tutorials) | [**Documentation**](#documentation) | [**Citation**](#citation) | [**License**](#license)

## Installation
You can install the UI with ```npm```: 
```bash
git clone # For the anonymised version, download the repo
cd EduCoder
npm install # Install Dependencies
```

## Getting Started
To run the UI:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (or the port shown in terminal if 3000 is occupied).

## Tutorials
Here is a 2-minute demo of what `EduCoder` can do: [coming soon]. <br>
We also provide one [exmaple transcript](https://github.com/KingArthur0205/EduCoder/tree/main/public/t001) and [codebook](https://github.com/KingArthur0205/EduCoder/blob/main/public/demo_feature.xlsx) for you to get started.

## Documentation

### Upload Feature Definition Codebook
The feature codebook nees to be in either XLSX or CSV formats.  Each sheet (XLSX) or file (CSV) becomes a feature category. The required columns are `Code` and `Definition`(definition of the code). `EduCoder` also supports optional columns for examples:`Example1`, `Example2`, `NonExample1`, `NonExample2`, ...
For this, read [this](https://github.com/KingArthur0205/EduCoder/blob/main/README_UPLOAD_FEATURE.md).

**Example Codebook Format**:
| Code   | Definition                      | Example1                         | NonExample1              |
|--------|----------------------------------|----------------------------------|---------------------------|
| `C.1`  | Use of mathematical language     | I added 12 and 18 to get 30.     | 12 + 18 = 30              |
| `D.1`  | Asking a peer for clarification  | What do you mean by "flip it"?  | Can we move on to the next? |
| `E.3`  | Justifying a reasoning step      | Because 4 times 2 is 8, we...    | It just feels right.      |

`EduCoder` will then render the feature definition in the UI: 
<p align="center">
  <img src="https://github.com/KingArthur0205/EduCoder/blob/main/figures/feature%20definition.png" width="800"/>
</p>


### Upload Transcript
The transcripts need to be in either XLSX or CSV formats. The required columns are `#`(line number), `Speaker`, and `Dialogue`. `EduCoder` also allows optional columns:
- `Selectable` — Mark with `"yes"` to enable annotation. If omitted, all rows are annotatable.  
- `Segment` — Group rows (e.g., `"a"`, `"b"`, `"c"`) for better viewing and filtering.
For details, read [this](https://github.com/KingArthur0205/EduCoder/blob/main/README_UPLOAD_FEATURE.md).

**Example Transcript Format**:
| #  | Speaker   | Dialogue                                 | Selectable | Segment |
|----|-----------|------------------------------------------|------------|---------|
| 1  | Teacher   | Hello everyone, welcome to class.        | no         | a       |
| 2  | Student 1 | Hi teacher!                              | yes        | a       |
| 3  | Student 2 | Good morning!                            | yes        | a       |


`EduCoder` will then create a workspace for annotation:
<p align="center">
  <img src="https://github.com/KingArthur0205/EduCoder/blob/main/figures/annotation%20UI.png" width="800"/>
</p>

### Configure LLM annotations
`EduCoder` allows users to generate annotation results by LLMs. Currently we have built-in ```ChatGPT-4O``` and ```Claude-4-Sonnet```. To allow this integration
1. Get your API keys from the respective model providers (e.g., OpenAI, Anthropic).
2. Configure the API keys in ```Setttings``` in the navigation page of `EduCoder`.
3. Select `model`, `annotation range`, and `features` for annotation and click `start`.

### Configure Google Cloud Storage
This project reads and writes data to Google Cloud Storage. To allow this integration:

1. Go to https://console.cloud.google.com/
2. Select IAM & Admin, then select Service Accounts
3. Create a new Service Account.
4. The service account comes with an email address that ends in @cosmic-anthem-412619.iam.gserviceaccount.com -- share the Google sheet to access with this account.
5. Download the service account details as JSON -- this should include a private key and client email.
6. Save the private key and client email as local environment variables. Convert to BASE64 format, and set in the settings of UI.
7. Select Cloud Storage, then select Storage Bucket
8. Create a storage bucket and set the name in the settings of UI.



## Cite `EduCoder`
```
Coming Soon
```

## License
MIT License, Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy.
