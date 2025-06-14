"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: Request) {
  try {
    const { userId: authUserId } = await auth()
    
    if (!authUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    console.log("Received upload request for user:", userId)
    console.log("Authenticated user ID:", authUserId)

    if (!file || !userId) {
      return NextResponse.json(
        { error: "File and userId are required" },
        { status: 400 }
      )
    }

    // Verify that the authenticated user matches the request user
    if (userId !== authUserId) {
      return NextResponse.json(
        { error: "Unauthorized: User ID mismatch" },
        { status: 403 }
      )
    }

    // Validate file type
    if (!["application/pdf", "text/plain"].includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and TXT files are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              console.error("Error setting cookie:", error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              console.error("Error removing cookie:", error)
            }
          },
        },
      }
    )

    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const fileName = `${timestamp}-${file.name}`
    const filePath = `${userId}/documents/${fileName}`

    console.log("Attempting to upload file to path:", filePath)

    // First, try to create the document record
    const { data: insertData, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        title: file.name,
        file_type: file.type,
        storage_uri: filePath,
        status: "uploaded"
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating document record:", insertError)
      return NextResponse.json(
        { error: `Failed to create document record: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log("Document record created successfully:", insertData)

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Then, upload the file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("user-uploads")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      // Delete the document record if file upload fails
      await supabase
        .from("documents")
        .delete()
        .eq("id", insertData.id)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log("File uploaded successfully:", uploadData)

    return NextResponse.json(
      { 
        message: "File uploaded successfully", 
        path: uploadData.path,
        documentId: insertData.id
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in upload route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
} 