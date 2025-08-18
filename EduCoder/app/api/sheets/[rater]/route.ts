import { splitIntoSentences } from "@/app/_helpers/splitIntoSentences";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

interface RequestBody {
  text: string;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ rater: string }> }
) {
  try {
    const { rater } = await params;
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n"
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Map rater to the corresponding spreadsheet ID
    const spreadsheetMap: Record<string, string | undefined> = {
      "tester": process.env.TEST_SPREADSHEET_ID,
      "RATERTEST": process.env.TESTER_IRR_SPREADSHEET,
      "RATER0": process.env.RATER0_IRR_SPREADSHEET,
      "RATER1": process.env.RATER1_IRR_SPREADSHEET,
      "RATER2": process.env.RATER2_IRR_SPREADSHEET,
      "RATER3": process.env.RATER3_IRR_SPREADSHEET,
      "RATER4": process.env.RATER4_IRR_SPREADSHEET,
      "RATER5": process.env.RATER5_IRR_SPREADSHEET,
      "RATER6": process.env.RATER6_IRR_SPREADSHEET,
      "RATER7": process.env.RATER7_IRR_SPREADSHEET,
      "RATER8": process.env.RATER8_IRR_SPREADSHEET,
      "RATER9": process.env.RATER9_IRR_SPREADSHEET,
      "RATER10": process.env.RATER10_IRR_SPREADSHEET,
      "RATER11": process.env.RATER11_IRR_SPREADSHEET,
      "RATER12": process.env.RATER12_IRR_SPREADSHEET,
      "RATER13": process.env.RATER13_IRR_SPREADSHEET,
      "RATER14": process.env.RATER14_IRR_SPREADSHEET,
    };

    const spreadsheetId = spreadsheetMap[rater];

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          error: "Invalid rater",
          details: "Rater must be a number between 0 and 5",
        },
        { status: 400 }
      );
    }

    // Get metadata to determine the available sheet names
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    // Use the first available sheet name
    const sheetName = spreadsheet.data.sheets?.[0].properties?.title;
    if (!sheetName) {
      return NextResponse.json(
        { error: "No sheet found", details: "Could not retrieve sheet name." },
        { status: 500 }
      );
    }

    // Fetch the data with a valid range
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, // Ensure this range exists in your sheet
    });

    // filter rows that have been processed
    // const processedRows = new Set<string>();

    const rows = response.data.values;

    const processedRows = rows?.filter((row, index) => {
      if (index === 0) {
        return true;
      }

      if (!row) {
        return false;
      }

      // The row has already been processed if there is a matching comment_id with an appended "_"
      if (
        !!rows.find((r) => {
          return r[8]?.includes(`${row[8]}_`) || row[8]?.includes("_");
        })
      ) {
        return false;
      }

      return true;
    });

    return NextResponse.json(processedRows);
  } catch (error) {
    console.error("Detailed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    const { text } = body;

    const split = splitIntoSentences(text);

    return NextResponse.json({ text: split });
  } catch (error) {
    console.error("Detailed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", details: (error as Error).message },
      { status: 500 }
    );
  }
}
