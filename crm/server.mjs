import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

dotenv.config({ path: path.resolve(ROOT_DIR, '.env') })

const app = express()
app.use(cors({
    origin: '*', // Allow all during migration, can restrict to specific domains later
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

const PORT = process.env.PORT || 3001
const HOST = '0.0.0.0' // Bind to all interfaces for cloud

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key for system operations

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('CRITICAL: Supabase environment variables missing!')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Health check for Railway deployment
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Authentication Middleware
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization
    console.log('Incoming request to:', req.path)

    if (!authHeader) {
        console.warn('Auth failed: No authorization header')
        return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
        console.error('Auth failed: Invalid or expired token', error)
        return res.status(401).json({ error: 'Invalid or expired token' })
    }

    console.log('Auth success for user:', user.email)
    req.user = user
    next()
}

// Store running processes
const runningProcesses = new Map()
let processIdCounter = 0

// API endpoint to run lead generator
app.post('/api/generate-leads', authenticate, (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/generate-leads hit with:`, req.body)
    const {
        location, radius, types, format,
        noWebsite, hasPhone, minRating,
        minReviews, maxReviews, noDetails
    } = req.body

    // Build command arguments
    const args = ['main.py', 'search']

    if (location) {
        args.push('--location', location)
    }
    if (radius) {
        args.push('--radius', radius.toString())
    }
    if (types) {
        args.push('--types', types)
    }
    if (format) {
        args.push('--format', format)
    }
    if (noWebsite) {
        args.push('--no-website')
    }
    if (hasPhone) {
        args.push('--has-phone')
    }
    if (minRating) {
        args.push('--min-rating', minRating.toString())
    }
    if (minReviews) {
        args.push('--min-reviews', minReviews.toString())
    }
    if (maxReviews) {
        args.push('--max-reviews', maxReviews.toString())
    }
    if (noDetails) {
        args.push('--no-details')
    }

    const processId = ++processIdCounter
    const output = []
    let isComplete = false
    let exitCode = null
    let exportedFile = null

    console.log(`[${new Date().toISOString()}] Spawning process: python ${args.join(' ')}`)
    console.log(`[${new Date().toISOString()}] Working directory: ${ROOT_DIR}`)

    const childProcess = spawn('python3', args, {
        cwd: ROOT_DIR,
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1'
        }
    })

    childProcess.stdout.on('data', (data) => {
        const text = data.toString()
        output.push(text)

        // Detect the exported file path
        const exportMatch = text.match(/Exported to:\s*(.+\.csv)/i)
        if (exportMatch) {
            exportedFile = exportMatch[1].trim()
        }
    })

    childProcess.stderr.on('data', (data) => {
        output.push(data.toString())
    })

    childProcess.on('close', (code) => {
        isComplete = true
        exitCode = code
    })

    childProcess.on('error', (err) => {
        output.push(`Error: ${err.message}`)
        console.error('Failed to start python process:', err)
        output.push(`[ERROR] Failed to start python process: ${err.message}. Make sure "python" is in your PATH.`)
        isComplete = true
        exitCode = 1
    })

    runningProcesses.set(processId, {
        childProcess,
        getOutput: () => output.join(''),
        isComplete: () => isComplete,
        getExitCode: () => exitCode,
        getExportedFile: () => exportedFile
    })

    res.json({ processId, message: 'Lead generation started' })
})

// Check process status
app.get('/api/process/:id', authenticate, (req, res) => {
    const processId = parseInt(req.params.id)
    const processData = runningProcesses.get(processId)

    if (!processData) {
        console.warn(`[${new Date().toISOString()}] Polling failed: Process ${processId} not found`)
        return res.status(404).json({ error: 'Process not found' })
    }

    console.log(`[${new Date().toISOString()}] Polling process ${processId}: state=${processData.isComplete() ? 'complete' : 'running'}`)

    res.json({
        output: processData.getOutput(),
        isComplete: processData.isComplete(),
        exitCode: processData.getExitCode(),
        exportedFile: processData.getExportedFile()
    })
})

// Get CSV data for import
app.get('/api/csv-data', (req, res) => {
    const { file } = req.query

    if (!file) {
        return res.status(400).json({ error: 'No file specified' })
    }

    // Clean the file path - remove ANSI codes and trim
    let cleanFile = file
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\[\d+m/g, '')
        .trim()

    console.log('CSV request - raw file:', file)
    console.log('CSV request - clean file:', cleanFile)
    console.log('ROOT_DIR:', ROOT_DIR)

    // Resolve the file path (it could be relative to ROOT_DIR)
    let filePath = cleanFile
    if (!path.isAbsolute(cleanFile)) {
        filePath = path.join(ROOT_DIR, cleanFile)
    }

    // Normalize the path for Windows
    filePath = path.normalize(filePath)

    console.log('Resolved file path:', filePath)
    console.log('File exists:', fs.existsSync(filePath))

    if (!fs.existsSync(filePath)) {
        // Try to find any CSV in the data folder as fallback
        const dataDir = path.join(ROOT_DIR, 'data')
        console.log('Checking data directory:', dataDir)

        if (fs.existsSync(dataDir)) {
            const csvFiles = fs.readdirSync(dataDir)
                .filter(f => f.endsWith('.csv'))
                .sort()
                .reverse()

            if (csvFiles.length > 0) {
                // Use the most recent CSV file
                filePath = path.join(dataDir, csvFiles[0])
                console.log('Using most recent CSV:', filePath)
            }
        }
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found', requestedPath: file, resolvedPath: filePath })
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8')
    res.json({ content: csvContent })
})

// Kill a process
app.delete('/api/process/:id', (req, res) => {
    const processId = parseInt(req.params.id)
    const proc = runningProcesses.get(processId)

    if (!proc) {
        return res.status(404).json({ error: 'Process not found' })
    }

    proc.childProcess.kill()
    runningProcesses.delete(processId)

    res.json({ message: 'Process killed' })
})

// Test API connection
app.post('/api/test-connection', (req, res) => {
    const processId = ++processIdCounter
    const output = []
    let isComplete = false
    let exitCode = null

    const childProcess = spawn('python3', ['main.py', 'test'], {
        cwd: ROOT_DIR,
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1'
        }
    })

    childProcess.stdout.on('data', (data) => {
        output.push(data.toString())
    })

    childProcess.stderr.on('data', (data) => {
        output.push(data.toString())
    })

    childProcess.on('close', (code) => {
        isComplete = true
        exitCode = code
    })

    runningProcesses.set(processId, {
        childProcess,
        getOutput: () => output.join(''),
        isComplete: () => isComplete,
        getExitCode: () => exitCode,
        getExportedFile: () => null
    })

    res.json({ processId, message: 'Test started' })
})

// Get presets
app.get('/api/presets', (req, res) => {
    const output = []

    const childProcess = spawn('python3', ['main.py', 'presets'], {
        cwd: ROOT_DIR,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
    })

    childProcess.stdout.on('data', (data) => {
        output.push(data.toString())
    })

    childProcess.on('close', () => {
        res.json({ output: output.join('') })
    })
})

// Get business types
app.get('/api/types', (req, res) => {
    const output = []

    const childProcess = spawn('python3', ['main.py', 'types'], {
        cwd: ROOT_DIR,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
    })

    childProcess.stdout.on('data', (data) => {
        output.push(data.toString())
    })

    childProcess.on('close', () => {
        res.json({ output: output.join('') })
    })
})

// Bulk fix business types via Place ID
app.post('/api/fix-types', async (req, res) => {
    const { leads } = req.body

    if (!leads || !Array.isArray(leads)) {
        return res.status(400).json({ error: 'Leads array required' })
    }

    // Need to import Lead for detection logic
    const scriptPath = path.join(ROOT_DIR, 'src', 'lead_extractor.py')

    // We'll use a temporary python script to perform the detection
    // to reuse the logic in src/lead_extractor.py
    const results = {}

    // For each lead, we need its types. If not provided, we might need to fetch them.
    // However, the user said "quickly fix all", so we'll prioritize leads with place_id.

    const leadsToProcess = leads.filter(l => l.place_id)
    console.log(`Fix-types request for ${leadsToProcess.length} leads with place_id`)

    if (leadsToProcess.length === 0) {
        console.log('No leads with place_id to process')
        return res.json({ updates: {} })
    }

    // Create a temporary python script to run the detection for all leads
    const tempScript = `
import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path.cwd()))

from src.lead_extractor import Lead
from src.places_api import PlacesAPIClient

def main():
    try:
        input_data = json.loads(sys.stdin.read())
        leads_to_process = input_data.get('leads', [])
        client = PlacesAPIClient()
        
        updates = {}
        
        for l in leads_to_process:
            lid = l.get('id')
            pid = l.get('place_id')
            existing_types = l.get('types', [])
            
            # If we don't have types but have place_id, fetch details
            if not existing_types and pid:
                try:
                    details = client.get_place_details(pid)
                    existing_types = details.get('types', [])
                except Exception:
                    continue
            
            # The Lead class now aggressively sanitizes business_type in __init__
            current_type = l.get('business_type', 'Business')
            lead_obj = Lead({"id": pid, "types": existing_types}, current_type)
            
            updates[lid] = {
                "business_type": lead_obj.business_type,
                "types": existing_types
            }
                
        print(json.dumps({"updates": updates}))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
`
    const tempScriptPath = path.join(ROOT_DIR, 'temp_fix_types.py')
    fs.writeFileSync(tempScriptPath, tempScript)

    const pythonProcess = spawn('python3', [tempScriptPath], {
        cwd: ROOT_DIR,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdin.write(JSON.stringify({ leads: leadsToProcess }))
    pythonProcess.stdin.end()

    pythonProcess.stdout.on('data', (data) => stdout += data.toString())
    pythonProcess.stderr.on('data', (data) => stderr += data.toString())

    pythonProcess.on('close', (code) => {
        // Clean up
        if (fs.existsSync(tempScriptPath)) {
            try { fs.unlinkSync(tempScriptPath) } catch (e) { }
        }

        if (code === 0) {
            try {
                const data = JSON.parse(stdout)
                const updateCount = Object.keys(data.updates || {}).length
                console.log(`Successfully processed types for ${updateCount} leads`)
                res.json(data)
            } catch (err) {
                console.error('Failed to parse python output:', stdout)
                res.status(500).json({ error: 'Failed to parse python output', output: stdout })
            }
        } else {
            console.error('Python fix-types script failed:', stderr)
            res.status(500).json({ error: 'Python script failed', details: stderr })
        }
    })
})

// Send email automation
app.post('/api/send-email', async (req, res) => {
    const { to, subject, body } = req.body

    if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, or body' })
    }

    try {
        console.log(`[Email] Attempting to send to ${to} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            // Fail fast if connection hangs
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 5000,
            socketTimeout: 10000
        })

        // Verify connection configuration
        await new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) {
                    console.error('[Email] SMTP Connection Error:', error);
                    reject(error);
                } else {
                    console.log('[Email] SMTP Connection Verified');
                    resolve(success);
                }
            });
        });

        const mailOptions = {
            from: `"Joao Vicente" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text: body,
            html: body.replace(/\n/g, '<br>'), // Simple text to html conversion
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent: %s', info.messageId)

        res.json({ message: 'Email sent successfully', messageId: info.messageId })
    } catch (error) {
        console.error('Error sending email:', error)
        res.status(500).json({ error: 'Failed to send email', details: error.message })
    }
})


app.listen(PORT, HOST, () => {
    console.log(`Lead Generator API running on http://${HOST}:${PORT}`)
    console.log(`Working directory: ${ROOT_DIR}`)
})
