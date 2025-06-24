# Upload Cleanup Script

This script helps you undo all the side effects of file uploads in your Personal Librarian system - removing duplicates and starting fresh while preserving your users and database schema.

## Prerequisites

Make sure you have all required environment variables set in your `.env.local` file:

```bash
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=librarian-index  # optional, defaults to "librarian-index"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Database URL (for Drizzle ORM)
DATABASE_URL=your_database_url_here
```

## Usage Options

### 🎯 Complete Upload Cleanup (Recommended)

This undoes all file upload side effects while preserving users and schema:

```bash
npm run cleanup:uploads
```

This will:
- Delete all Pinecone vectors (all namespaces)
- Delete all files from Supabase storage bucket
- Delete upload-related database records (documents, content_items)
- **Preserve**: Users, database schema, LLM reports, chat history
- Show detailed statistics for each cleanup step

### 🎯 User-Specific Upload Cleanup

Clean up uploads for a specific user only:

```bash
npx ts-node scripts/cleanup-pinecone.ts --comprehensive --user=user_2yOOPLgVWQEKxKGA0vb4E5MXMJK
```

### 🔧 Individual Component Cleanup

#### Pinecone Vectors Only

```bash
npm run cleanup-pinecone
```

Deletes all vectors but keeps the index structure intact.

#### Supabase Storage Only

```bash
npm run cleanup:storage
```

Deletes all files from the `user-uploads` bucket.

#### Upload Database Records Only

```bash
npm run cleanup:database
```

Deletes upload-related database records (documents, content_items) while preserving users and other data.

#### Delete Entire Pinecone Index

```bash
npm run cleanup-pinecone:full
```

⚠️ **Warning**: Completely removes the Pinecone index. It will be recreated when you upload new documents.

## What the Upload Cleanup Script Does

### Pinecone Cleanup
1. **Connects to Pinecone** using your API key
2. **Shows current statistics** (total vectors, namespaces)
3. **Deletes vectors** from all namespaces
4. **Waits for propagation** (5 seconds)
5. **Shows final statistics** to confirm cleanup

### Supabase Storage Cleanup
1. **Connects to Supabase** using your project credentials
2. **Lists all files** in the `user-uploads` bucket
3. **Deletes files** in batches (handles large numbers of files)
4. **Shows deletion progress** and final count

### Upload Database Cleanup
1. **Connects to your database** using Drizzle ORM
2. **Deletes content_items** first (due to foreign key constraints)
3. **Deletes documents** records (what shows in "View Uploaded Docs")
4. **Preserves users, llm_reports, and prompt_history**
5. **Shows deletion counts** for cleaned tables

## Common Issues

### "Index not found"
- Check your `PINECONE_INDEX_NAME` in `.env.local`
- Verify you're using the correct Pinecone project/API key
- The index might have been deleted already

### "API key error"
- Check your `PINECONE_API_KEY` in `.env.local`
- Make sure the API key is valid and has the right permissions

### "Vectors still remain"
- This is normal due to propagation delays
- Wait a few minutes and run the script again
- Pinecone's eventual consistency means deletions take time to propagate

### "Storage files not found"
- Check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify the `user-uploads` bucket exists in your Supabase project
- Make sure your Supabase API key has storage permissions

### "Database connection error"
- Check your `DATABASE_URL` in `.env.local`
- Ensure your database is running and accessible
- Verify your database credentials are correct

## After Upload Cleanup

Once you've run the upload cleanup:

1. **Upload documents again** through your app's interface
2. **The Pinecone index will be recreated automatically** when you upload the first document
3. **New database records will be created** for each uploaded document
4. **Files will be stored fresh** in Supabase storage
5. **Your RAG system will work with clean, duplicate-free data**

## Manual Verification

You can verify the cleanup worked by checking:
- **Pinecone Dashboard**: [https://app.pinecone.io/](https://app.pinecone.io/)
- **Supabase Dashboard**: Your project's Storage section
- **Database**: Query your tables directly to confirm they're empty
- **App Interface**: "View Uploaded Docs" should show 0 documents 