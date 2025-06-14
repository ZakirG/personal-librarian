"use server"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ActionState } from "@/types"

export async function extractTextFromFileAction(
  filePath: string
): Promise<ActionState<string>> {
  try {
    const supabase = createClientComponentClient()

    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("user-uploads")
      .download(filePath)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Convert the file to text
    const text = await fileData.text()
    console.log(`Extracted ${text.length} characters from file`)

    return {
      isSuccess: true,
      message: "Text extracted successfully",
      data: text
    }
  } catch (error) {
    console.error("Error in extractTextFromFileAction:", error)
    return {
      isSuccess: false,
      message: "Failed to extract text from file"
    }
  }
} 