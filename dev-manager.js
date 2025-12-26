#!/usr/bin/env node

const { spawn, exec } = require('child_process')
const path = require('path')
const readline = require('readline')

class DevManager {
    constructor() {
        this.backendProcess = null
        this.frontendProcess = null
        this.isShuttingDown = false

        // Graceful shutdown handling
        process.on('SIGINT', () => this.shutdown('SIGINT'))
        process.on('SIGTERM', () => this.shutdown('SIGTERM'))

        // Create readline interface for user input
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().substr(11, 8)
        const colors = {
            info: '\x1b[36m',
            success: '\x1b[32m',
            error: '\x1b[31m',
            warning: '\x1b[33m',
            reset: '\x1b[0m'
        }
        console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
    }

    async checkPrerequisites() {
        this.log('Checking prerequisites...')

        // Check if Docker is running
        try {
            await this.runCommand('docker info')
            this.log('✓ Docker is running', 'success')
        } catch (error) {
            this.log('✗ Docker is not running. Please start Docker first.', 'error')
            process.exit(1)
        }

        // Check if Node.js is available
        try {
            await this.runCommand('node --version')
            this.log('✓ Node.js is available', 'success')
        } catch (error) {
            this.log('✗ Node.js is not available', 'error')
            process.exit(1)
        }

        // Check if npm is available
        try {
            await this.runCommand('npm --version')
            this.log('✓ npm is available', 'success')
        } catch (error) {
            this.log('✗ npm is not available', 'error')
            process.exit(1)
        }
    }

    runCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            exec(command, options, (error, stdout, stderr) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(stdout.trim())
                }
            })
        })
    }

    async startBackend() {
        this.log('Starting GoCart Backend...')

        const backendPath = path.join(__dirname, 'gocart-backend')

        return new Promise((resolve, reject) => {
            this.backendProcess = spawn('docker-compose', ['up', '--build'], {
                cwd: backendPath,
                stdio: ['inherit', 'inherit', 'inherit'],
                detached: false
            })

            this.backendProcess.on('error', (error) => {
                this.log(`Backend start failed: ${error.message}`, 'error')
                reject(error)
            })

            // Wait a bit for Docker to start
            setTimeout(() => {
                this.log('✓ Backend started successfully', 'success')
                resolve()
            }, 3000)
        })
    }

    async startFrontend() {
        this.log('Starting GoCart Frontend...')

        const frontendPath = path.join(__dirname, 'gocart')

        return new Promise((resolve, reject) => {
            this.frontendProcess = spawn('npm', ['run', 'dev'], {
                cwd: frontendPath,
                stdio: ['inherit', 'inherit', 'inherit'],
                detached: false
            })

            this.frontendProcess.on('error', (error) => {
                this.log(`Frontend start failed: ${error.message}`, 'error')
                reject(error)
            })

            // Wait for Next.js to start (usually takes a few seconds)
            setTimeout(() => {
                this.log('✓ Frontend started successfully', 'success')
                resolve()
            }, 5000)
        })
    }

    async stopBackend() {
        this.log('Stopping GoCart Backend...')

        try {
            const backendPath = path.join(__dirname, 'gocart-backend')
            await this.runCommand('docker-compose down', { cwd: backendPath })
            this.log('✓ Backend stopped successfully', 'success')
        } catch (error) {
            this.log(`Error stopping backend: ${error.message}`, 'error')
        }
    }

    stopFrontend() {
        this.log('Stopping GoCart Frontend...')

        if (this.frontendProcess) {
            this.frontendProcess.kill('SIGTERM')

            // Give it some time to shutdown gracefully
            setTimeout(() => {
                if (!this.frontendProcess.killed) {
                    this.frontendProcess.kill('SIGKILL')
                }
                this.log('✓ Frontend stopped', 'success')
            }, 2000)
        }
    }

    async shutdown(signal) {
        if (this.isShuttingDown) return
        this.isShuttingDown = true

        this.log(`Received ${signal}, shutting down gracefully...`, 'warning')

        // Stop both services
        await this.stopBackend()
        this.stopFrontend()

        this.rl.close()
        process.exit(0)
    }

    async start() {
        this.log('🚀 Starting GoCart Development Environment', 'success')
        this.log('=' .repeat(50))

        try {
            // Check prerequisites
            await this.checkPrerequisites()

            // Start backend first
            await this.startBackend()

            // Then start frontend
            await this.startFrontend()

            this.log('')
            this.log('🎉 GoCart is now running!', 'success')
            this.log('📱 Frontend: http://localhost:3000')
            this.log('🔧 Backend API: http://localhost:5000')
            this.log('🗄️  Database GUI: http://localhost:5555')
            this.log('')
            this.log('Press Ctrl+C to stop all services')
            this.log('=' .repeat(50))

            // Keep the process running
            return new Promise(() => {}) // Never resolves, keeps process alive

        } catch (error) {
            this.log(`Failed to start services: ${error.message}`, 'error')
            process.exit(1)
        }
    }

    async stop() {
        this.log('🛑 Stopping GoCart Development Environment', 'warning')

        try {
            await this.stopBackend()
            this.stopFrontend()
            this.log('✓ All services stopped successfully', 'success')
        } catch (error) {
            this.log(`Error during shutdown: ${error.message}`, 'error')
        }
    }

    showHelp() {
        console.log(`
GoCart Development Manager

Usage:
  node dev-manager.js start    Start both frontend and backend
  node dev-manager.js stop     Stop both frontend and backend
  node dev-manager.js help     Show this help message

Examples:
  node dev-manager.js start    # Start the entire stack
  node dev-manager.js stop     # Stop everything

The manager will:
- Check if Docker and Node.js are available
- Start the backend with Docker Compose
- Start the frontend with npm run dev
- Monitor both processes
- Handle graceful shutdown on Ctrl+C

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Database GUI: http://localhost:5555
        `)
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2)
    const command = args[0] || 'help'

    const manager = new DevManager()

    switch (command) {
        case 'start':
            await manager.start()
            break
        case 'stop':
            await manager.stop()
            break
        case 'help':
        default:
            manager.showHelp()
            break
    }
}

if (require.main === module) {
    main().catch(console.error)
}

module.exports = DevManager
