#!/usr/bin/env node

/**
 * Amazon Ads Knowledge Base - Agent Invocation Module
 *
 * Bridges Node.js to Claude Code CLI for programmatic agent execution.
 * Loads agent definitions, calls Claude Code CLI, handles JSON input/output,
 * and implements retry logic for reliable pipeline automation.
 *
 * @module scripts/agent-invoker
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ANSI colors for logging
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * AgentInvoker - Programmatic Claude Code Agent Execution
 *
 * Handles loading agent definitions, calling Claude Code CLI,
 * and managing structured JSON input/output for pipeline automation.
 */
class AgentInvoker {
  /**
   * Initialize the invoker with configuration
   * @param {Object} options - Configuration options
   * @param {string} options.projectDir - Project directory path
   * @param {string} options.settingsPath - Path to settings.json
   * @param {number} options.timeoutMs - Request timeout in milliseconds
   * @param {number} options.maxRetries - Maximum retry attempts
   * @param {number} options.retryDelayMs - Initial retry delay in milliseconds
   */
  constructor(options = {}) {
    this.projectDir = options.projectDir || process.cwd();
    this.settingsPath = options.settingsPath || path.join(this.projectDir, '.claude', 'settings.json');
    this.timeoutMs = options.timeoutMs || 300000; // 5 minutes default
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 5000;

    // Metrics tracking
    this.metrics = {
      invocations: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      totalTime: 0
    };

    // Load configuration
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from settings.json
   * @returns {Object} Configuration object
   */
  loadConfiguration() {
    try {
      const settingsContent = fs.readFileSync(this.settingsPath, 'utf8');
      const settings = JSON.parse(settingsContent);

      // Extract CLI configuration
      const config = {
        model: settings.env?.CLAUDE_CODE_SUBAGENT_MODEL || 'glm-4.7',
        timeoutMs: parseInt(settings.env?.AGENT_INVOCATION_TIMEOUT_MS) || this.timeoutMs,
        maxRetries: parseInt(settings.env?.AGENT_INVOCATION_MAX_RETRIES) || this.maxRetries,
        retryDelayMs: parseInt(settings.env?.AGENT_INVOCATION_RETRY_DELAY_MS) || this.retryDelayMs
      };

      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Load agent definition from .md file
   * @param {string} agentName - Name of the agent (e.g., 'scout', 'extractor')
   * @returns {string} Agent definition content
   */
  loadAgentDefinition(agentName) {
    const agentPath = path.join(this.projectDir, '.claude', 'agents', `${agentName}.md`);

    if (!fs.existsSync(agentPath)) {
      throw new Error(`Agent definition not found: ${agentPath}`);
    }

    const definition = fs.readFileSync(agentPath, 'utf8');
    this.log('AGENT-INVOKER', `Loaded agent definition: ${agentName}`, colors.cyan);
    return definition;
  }

  /**
   * Prepare prompt for API call
   * @param {string} agentName - Name of the agent
   * @param {string} agentDefinition - Agent definition content
   * @param {Object} inputData - Input data for the agent
   * @returns {string} Formatted prompt for API call
   */
  prepareAgentPrompt(agentName, agentDefinition, inputData) {
    return `
**AGENT EXECUTION MODE: PROGRAMMATIC PIPELINE**
You are being invoked programmatically by the pipeline orchestrator to execute as the ${agentName.toUpperCase()} agent.

${agentDefinition}

**CURRENT INPUT DATA:**
\`\`\`json
${JSON.stringify(inputData, null, 2)}
\`\`\`

**EXECUTION INSTRUCTIONS:**
1. Read and follow your agent definition above exactly
2. Process the input data according to your agent responsibilities
3. Use any tools or methods specified in your agent definition
4. Follow the exact output format specified in your agent definition

**CRITICAL RESPONSE REQUIREMENTS:**
Your final response MUST be a JSON object with this exact structure:
\`\`\`json
{
  "status": "success" | "error",
  "stage": "${agentName}",
  "data": {
    // Your agent-specific output data according to your definition
  },
  "error": "Error message only if status is 'error'"
}
\`\`\`

**IMPORTANT OUTPUT RULES:**
- Return ONLY the JSON object as your final response
- Do not include explanatory text before or after the JSON
- Ensure all required fields are present in your response
- Follow the exact output format from your agent definition
- If status is "error", the "error" field is required
- If status is "success", the "data" field is required

Execute your agent responsibilities now and return the JSON response.
`;
  }

  /**
   * Call Claude Code CLI with agent prompt
   * @param {string} prompt - The prompt to send
   * @returns {Promise<Object>} Parsed CLI response
   */
  async callClaudeCLI(prompt) {
    return new Promise((resolve, reject) => {
      const args = [
        '-p',                           // Non-interactive mode
        '--output-format', 'json',      // JSON output format
        '--settings', this.settingsPath, // Use project settings
        '--no-session-persistence',      // Don't save session
        '--allow-dangerously-skip-permissions', // Skip permission prompts
        prompt
      ];

      const claude = spawn('claude', args, {
        cwd: this.projectDir,
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: this.projectDir
        }
      });

      let stdout = '';
      let stderr = '';
      let jsonOutput = '';

      // Set up timeout
      const timer = setTimeout(() => {
        claude.kill('SIGTERM');
        reject(new Error(`Claude CLI execution timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      claude.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;

        // Try to extract JSON from output
        const jsonMatch = chunk.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          jsonOutput += jsonMatch[0];
        }
      });

      claude.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      claude.on('close', (code) => {
        clearTimeout(timer);

        if (code !== 0) {
          return reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        }

        try {
          // Parse the entire stdout as JSON (CLI returns full response object)
          const cliResponse = JSON.parse(stdout.trim());
          return resolve(cliResponse);
        } catch (e) {
          // If JSON parsing fails, try to extract JSON from text output
          const extracted = this.extractJSONFromText(stdout);
          if (extracted) {
            return resolve(extracted);
          }

          return reject(new Error(`Failed to parse CLI output: ${e.message}\nOutput: ${stdout}`));
        }
      });

      claude.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start Claude CLI: ${error.message}`));
      });
    });
  }

  /**
   * Extract JSON from text output
   * @param {string} text - Text that may contain JSON
   * @returns {Object|null} Extracted JSON object or null
   */
  extractJSONFromText(text) {
    // Try to extract JSON from markdown code blocks first
    const codeBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
    const codeBlockMatch = text.match(codeBlockPattern);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e) {
        // Continue to other extraction methods
      }
    }

    // Try to extract plain JSON object
    const jsonPattern = /\{[\s\S]*?\}/;
    const match = text.match(jsonPattern);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Extract JSON from CLI response
   * @param {Object} cliResponse - Raw CLI response
   * @returns {Object} Extracted JSON object
   */
  extractJSONFromResponse(cliResponse) {
    try {
      // Handle Claude Code CLI response format
      if (cliResponse.result) {
        // Extract JSON from the result field (may contain markdown code blocks)
        const extracted = this.extractJSONFromText(cliResponse.result);
        if (extracted) {
          return extracted;
        }
        throw new Error(`Could not extract valid JSON from CLI result`);
      }

      // Handle structured_output field if available
      if (cliResponse.structured_output) {
        return cliResponse.structured_output;
      }

      throw new Error('Unexpected CLI response format');
    } catch (error) {
      throw new Error(`Failed to extract JSON from response: ${error.message}`);
    }
  }

  /**
   * Validate agent response structure
   * @param {Object} response - Agent response to validate
   * @param {string} agentName - Expected agent name
   * @returns {boolean} True if valid
   */
  validateAgentResponse(response, agentName) {
    // Check required fields
    if (!response.hasOwnProperty('status')) {
      throw new Error('Agent response missing required field: status');
    }

    if (!response.hasOwnProperty('stage')) {
      throw new Error('Agent response missing required field: stage');
    }

    // Validate status value (success, warning, or error are valid)
    if (response.status !== 'success' && response.status !== 'warning' && response.status !== 'error') {
      throw new Error(`Invalid status value: ${response.status}`);
    }

    // Validate stage matches
    if (response.stage !== agentName) {
      throw new Error(`Stage mismatch: expected ${agentName}, got ${response.stage}`);
    }

    // Validate error status requirements
    if (response.status === 'error') {
      if (!response.error) {
        throw new Error('Error status requires error message field');
      }
    }

    // Validate success/warning status requirements
    if (response.status === 'success' || response.status === 'warning') {
      if (!response.data) {
        throw new Error('Success/warning status requires data field');
      }
    }

    return true;
  }

  /**
   * Invoke agent with retry logic
   * @param {string} agentName - Name of the agent
   * @param {Object} inputData - Input data for the agent
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Agent response
   */
  async invokeAgentWithRetry(agentName, inputData, options = {}) {
    const maxRetries = options.maxRetries || this.config.maxRetries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(agentName.toUpperCase(), `Attempt ${attempt}/${maxRetries}...`, colors.cyan);

        const result = await this.invokeAgent(agentName, inputData, options);

        if (attempt > 1) {
          this.metrics.retries++;
          this.log(agentName.toUpperCase(), `Success on attempt ${attempt}`, colors.green);
        }

        return result;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          this.log(agentName.toUpperCase(), `Failed, retrying in ${delay/1000}s...`, colors.yellow);
          await this.delay(delay);
        } else {
          this.log(agentName.toUpperCase(), `Failed after ${maxRetries} attempts`, colors.red);
        }
      }
    }

    throw new Error(`Agent ${agentName} failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Invoke agent (single attempt)
   * @param {string} agentName - Name of the agent
   * @param {Object} inputData - Input data for the agent
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Agent response
   */
  async invokeAgent(agentName, inputData, options = {}) {
    const startTime = Date.now();
    this.metrics.invocations++;

    try {
      // Load agent definition
      const agentDefinition = this.loadAgentDefinition(agentName);

      // Prepare prompt
      const prompt = this.prepareAgentPrompt(agentName, agentDefinition, inputData);

      // Make CLI call
      const cliResponse = await this.callClaudeCLI(prompt);

      // Extract JSON from response
      const agentResponse = this.extractJSONFromResponse(cliResponse);

      // Validate response structure
      this.validateAgentResponse(agentResponse, agentName);

      // Track success
      this.metrics.successes++;
      this.metrics.totalTime += Date.now() - startTime;

      this.log(agentName.toUpperCase(), `Agent execution completed`, colors.green);
      return agentResponse;

    } catch (error) {
      // Track failure
      this.metrics.failures++;
      this.metrics.totalTime += Date.now() - startTime;

      throw new Error(`Agent ${agentName} invocation failed: ${error.message}`);
    }
  }

  /**
   * Delay helper for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution metrics
   * @returns {Object} Metrics summary
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageTime: this.metrics.invocations > 0
        ? this.metrics.totalTime / this.metrics.invocations
        : 0,
      successRate: this.metrics.invocations > 0
        ? (this.metrics.successes / this.metrics.invocations) * 100
        : 0
    };
  }

  /**
   * Log helper function
   * @param {string} stage - Stage name
   * @param {string} message - Log message
   * @param {string} color - ANSI color code
   */
  log(stage, message, color = colors.blue) {
    console.log(`${color}[${stage}]${colors.reset} ${message}`);
  }
}

// Export for use in ingest.js
module.exports = AgentInvoker;

// If run directly, provide simple test interface
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node agent-invoker.js <agent-name> <input-json>');
    console.log('Example: node agent-invoker.js scout \'{"url":"https://example.com"}\'');
    process.exit(1);
  }

  const agentName = args[0];
  const inputData = JSON.parse(args[1]);

  const invoker = new AgentInvoker();
  invoker.invokeAgent(agentName, inputData)
    .then(result => {
      console.log('\n✅ Agent execution successful:');
      console.log(JSON.stringify(result, null, 2));

      console.log('\n📊 Metrics:');
      console.log(JSON.stringify(invoker.getMetrics(), null, 2));

      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Agent execution failed:', error.message);
      console.error('\n📊 Metrics:');
      console.error(JSON.stringify(invoker.getMetrics(), null, 2));
      process.exit(1);
    });
}