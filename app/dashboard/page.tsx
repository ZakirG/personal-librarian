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
import { Bell, ChevronDown, ChevronRight, FileText, Plus, Send, User } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { getLlmReportsByUserIdAction } from "@/actions/db/llm-reports-actions"
import { processChatMessageAction } from "@/actions/chat-service"
import { SelectLlmReport } from "@/db/schema"

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
  const [reports, setReports] = useState<SelectLlmReport[]>([])
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Load reports when component mounts
  useEffect(() => {
    if (user?.id) {
      loadReports()
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

  const loadReports = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    try {
      const result = await getLlmReportsByUserIdAction(user.id)
      if (result.isSuccess && result.data) {
        setReports(result.data)
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleReport = (reportId: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reportId)) {
        newSet.delete(reportId)
      } else {
        newSet.add(reportId)
      }
      return newSet
    })
  }

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
        
        // If a new report was generated, refresh the reports list
        if (result.data.reportGenerated) {
          loadReports()
        }
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
            <Link href="/profile">
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Reports Feed */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Research Reports</h2>
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No reports yet. Start a conversation or upload documents to generate research reports!</p>
              </div>
            ) : (
              reports.map((report) => {
                const isExpanded = expandedReports.has(report.id)
                const preview = report.content.length > 150 
                  ? report.content.substring(0, 150) + '...'
                  : report.content
                
                return (
                  <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader onClick={() => toggleReport(report.id)} className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            {report.title || 'Research Report'}
                          </CardTitle>
                          {!isExpanded && (
                            <CardDescription className="mt-2 text-sm">
                              {preview}
                            </CardDescription>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {report.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="prose max-w-none">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">{report.content}</div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })
            )}

            {/* Chat Messages */}
            <div className="space-y-3 mt-8">
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
                onKeyPress={(e) => e.key === 'Enter' && !isSending && sendMessage()}
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your files here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: PDF, TXT
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-4 inline-block cursor-pointer"
                >
                  <Button variant="outline">Choose Files</Button>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600">
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 