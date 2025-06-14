/*
<ai_context>
Main dashboard page for Personal Librarian - displays uploaded documents, research reports, and chat interface
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, FileText, Plus, Send, User } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { processChatMessageAction } from "@/actions/chat-service"
import { documentsTable } from "@/db/schema"
import { processAndEmbedDocumentAction } from "@/actions/db/process-and-embed-actions"
import { getDocumentsByUserIdAction } from "@/actions/db/documents-actions"

interface Report {
  id: string
  title: string
  preview: string
  content: string
  timestamp: Date
  expanded: boolean
}

interface Message {
  id: string
  type: 'user' | 'assistant' | 'report'
  content: string
  timestamp: Date
}

export default function DashboardPage() {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isViewDocsModalOpen, setIsViewDocsModalOpen] = useState(false)
  const [documents, setDocuments] = useState<typeof documentsTable.$inferSelect[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change or when loading state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current && scrollAreaRef.current) {
        // Find the scroll viewport within the ScrollArea
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (viewport) {
          // Smooth scroll to the bottom
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          })
        } else {
          // Fallback to regular scrollIntoView
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }

    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timeoutId)
  }, [messages, isSending])

  // Add welcome message when component mounts
  useEffect(() => {
    if (user?.id) {
      // Add welcome message
      setMessages([
        {
          id: '1',
          type: 'assistant',
          content: 'Welcome to Personal Librarian! Upload some documents or ask me anything to get started. I can research topics and generate detailed reports for you.',
          timestamp: new Date()
        }
      ])
    }
  }, [user?.id])

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || isSending) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    const currentMessage = newMessage
    setNewMessage('')
    setIsSending(true)
    
    try {
      const result = await processChatMessageAction(user.id, currentMessage)
      
      if (result.isSuccess && result.data) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.data.message,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiResponse])
        
        // Report generated successfully (no need to refresh UI since we're not showing reports)
      } else {
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorResponse])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsSending(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles)
      setIsUploadModalOpen(true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter(file => 
        file.type === 'application/pdf' || file.type === 'text/plain'
      )
      setFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // First upload the file to Supabase Storage
      const formData = new FormData()
      formData.append("file", file)
      formData.append("userId", user.id)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.message || "Failed to upload file")
      }

      const { path, documentId } = await uploadResponse.json()

      // Show processing message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "assistant",
          content: "Processing your document... This may take a few moments.",
          timestamp: new Date()
        }
      ])

      // Then process and embed the document
      const processResult = await processAndEmbedDocumentAction(
        user.id,
        path,
        documentId,
        file.name
      )

      if (!processResult.isSuccess) {
        throw new Error(processResult.message)
      }

      // Show success message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "assistant",
          content: `File uploaded and processed successfully! I've extracted ${processResult.data.totalChunks} chunks of text and stored them in the vector database. You can now ask questions about this document.`,
          timestamp: new Date()
        }
      ])

      // Document processed successfully
    } catch (error) {
      console.error("Error uploading file:", error)
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to process file"}`,
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoading(false)
      setFiles([])
      setIsUploadModalOpen(false)
    }
  }

  const handleUploadClick = () => {
    if (files.length > 0) {
      files.forEach(file => handleFileUpload(file))
    }
  }

  const loadDocuments = async () => {
    if (!user?.id) return
    
    try {
      const result = await getDocumentsByUserIdAction(user.id)
      if (result.isSuccess && result.data) {
        setDocuments(result.data)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  useEffect(() => {
    if (isViewDocsModalOpen) {
      loadDocuments()
    }
  }, [isViewDocsModalOpen])

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Personal Librarian</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add new docs
            </Button>
            <Button
              onClick={() => setIsViewDocsModalOpen(true)}
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Uploaded Docs
            </Button>
            <Link href="/profile">
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Reports Feed */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Chat Messages */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Conversation</h3>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator when AI is responding */}
              {isSending && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-900">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll target */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <div className="border-t p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send the agent feedback or commands here..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                className="flex-1"
                disabled={isSending}
              />
              <Button 
                onClick={sendMessage} 
                className="bg-blue-500 hover:bg-blue-600"
                disabled={isSending}
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Drag and drop PDF or text files to add them to your personal library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your files here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: PDF, TXT
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="mt-4 inline-block cursor-pointer"
                >
                  <Button variant="outline">Choose Files</Button>
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsUploadModalOpen(false)
                    setFiles([])
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  onClick={handleUploadClick}
                  disabled={files.length === 0 || isLoading}
                >
                  {isLoading ? "Processing..." : "Upload"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Documents Modal */}
      {isViewDocsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Your Uploaded Documents</CardTitle>
              <CardDescription>
                View and manage your uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No documents uploaded yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-gray-500">
                              {doc.fileType} • {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            doc.status === 'embedded' 
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'parsed'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDocsModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 