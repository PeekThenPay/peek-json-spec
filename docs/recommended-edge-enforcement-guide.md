# Recommended Edge Enforcement Implementation Guide

**⚠️ This is a specification with recommended implementation patterns. Publishers are free to implement enforcement using any technology stack that meets the peek.json standard requirements.**

This guide provides recommended patterns for implementing peek.json enforcement at the edge layer, ensuring AI systems never interact directly with tool service endpoints while maintaining security, performance, and compliance with the standard.

## 🏗️ Architecture Principles

### Edge-Centric Design
The peek.json standard is designed for modern edge computing environments where enforcement happens at the CDN/edge worker layer:

```
AI System → Edge Worker → Tool Service → Edge Worker → AI System
    ↓           ↓             ↓           ↓           ↓
  License    Validate     Process     Format      Return
  Headers    & Route      Content     Response    Content
```

**Core Benefits:**
- **🔒 Security**: Tool endpoints never publicly accessible
- **⚡ Performance**: Geographic distribution and caching
- **🛡️ Protection**: Natural DDoS mitigation and rate limiting
- **📊 Compliance**: Centralized audit trail and quota enforcement

### Edge Worker Responsibilities
- **License Validation**: Verify JWT tokens and remaining quotas
- **Bot Detection**: Integrate with pluggable detection services
- **Request Routing**: Route authenticated requests to appropriate backends
- **Response Processing**: Format and return processed content
- **Usage Tracking**: Record usage and update license quotas

### Tool Service Layer
- **Internal Access Only**: Services never exposed directly to AI systems
- **Pre-authenticated Requests**: Edge workers handle all authentication
- **Implementation Flexibility**: Can be internal, SaaS, or hybrid solutions
- **Horizontal Scaling**: Scale behind edge layer without exposure

## 🤖 Bot Detection Integration

### Pluggable Detection Services

Rather than relying on simple User-Agent patterns, we recommend integrating with professional bot detection services:

**Enterprise Solutions:**
- **Cloudflare Bot Management**: Comprehensive behavioral analysis
- **DataDome**: Real-time bot detection with ML
- **PerimeterX**: Advanced threat detection
- **AWS WAF**: Rule-based and ML bot detection

**Implementation Pattern:**
```javascript
// Example integration with pluggable bot detection
async function detectBot(request) {
  // Integrate with your chosen bot detection service
  const detectionResult = await botDetectionService.analyze(request);
  
  return {
    isBot: detectionResult.isBot,
    confidence: detectionResult.confidence,
    category: detectionResult.category, // AI, crawler, scraper, etc.
  };
}
```

### Detection Flow
1. **Request Analysis**: Bot detection service analyzes request patterns
2. **Classification**: Determine if request is from AI system, crawler, or human
3. **Policy Application**: Apply peek.json policies based on detection results
4. **Enforcement**: Require license for detected AI systems

## 🔐 License Validation

### JWT Verification
```javascript
async function validateLicense(request) {
  const authHeader = request.headers.get('Authorization');
  const licenseId = request.headers.get('X-Peek-License');
  const requestedTool = request.headers.get('X-Peek-Tool');
  
  if (!authHeader || !licenseId || !requestedTool) {
    return { valid: false, error: 'missing_license_headers' };
  }
  
  try {
    // Verify JWT signature and decode
    const jwt = authHeader.replace('Bearer ', '');
    const decoded = await verifyJWT(jwt, JWT_SECRET);
    
    // Validate with license API
    const licenseCheck = await fetch(`${LICENSE_API_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_id: licenseId,
        tool: requestedTool,
        domain: request.url.hostname
      })
    });
    
    const result = await licenseCheck.json();
    return {
      valid: result.valid,
      remainingBudget: result.remaining_budget,
      toolAllowed: result.tool_allowed
    };
    
  } catch (error) {
    return { valid: false, error: 'license_validation_failed' };
  }
}
```

### Quota Enforcement
- **Real-time Tracking**: Update usage counters immediately
- **Budget Validation**: Check remaining budget before processing
- **Rate Limiting**: Enforce per-tool rate limits from peek.json
- **Graceful Degradation**: Handle license API outages per `failover_mode`

## 🔄 Enforcement Method Implementation

### Trust Enforcement
When `enforcement_method` is `"trust"`, serve raw content with license validation:

```javascript
async function handleTrustEnforcement(request, peekConfig, tool) {
  // Validate license
  const license = await validateLicense(request);
  if (!license.valid) {
    return new Response(JSON.stringify(peekConfig), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Fetch and return raw content
  const content = await fetch(request.url);
  const response = await content.text();
  
  // Record usage
  await recordUsage(license.id, tool, request.url, content.length);
  
  return new Response(response, {
    status: 200,
    headers: {
      'Content-Type': content.headers.get('Content-Type'),
      'X-Peek-Cost': calculateCost(tool, content.length),
      'X-Peek-License-Remaining': license.remainingBudget
    }
  });
}
```

### Tool-Required Enforcement
When `enforcement_method` is `"tool_required"`, route to internal tool service:

```javascript
async function handleToolRequiredEnforcement(request, peekConfig, tool) {
  // Validate license
  const license = await validateLicense(request);
  if (!license.valid) {
    return new Response(JSON.stringify(peekConfig), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Route to internal tool service
  const toolResponse = await fetch(`${INTERNAL_TOOL_API}/${tool}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERNAL_SERVICE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: request.url.toString(),
      output_format: request.headers.get('X-Output-Format') || 'json'
    })
  });
  
  const processedContent = await toolResponse.json();
  
  // Record usage
  await recordUsage(license.id, tool, request.url, processedContent.length);
  
  return new Response(JSON.stringify(processedContent), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Peek-Cost': calculateCost(tool, processedContent.length),
      'X-Peek-License-Remaining': license.remainingBudget,
      'X-Peek-Processing': 'tool_required'
    }
  });
}
```

### Both Enforcement
When `enforcement_method` is `"both"`, respect AI system preferences:

```javascript
async function handleBothEnforcement(request, peekConfig, tool) {
  const preferProcessing = request.headers.get('X-Prefer-Processing');
  
  // Default to tool_required unless AI explicitly prefers trust
  if (preferProcessing === 'trust') {
    return handleTrustEnforcement(request, peekConfig, tool);
  } else {
    return handleToolRequiredEnforcement(request, peekConfig, tool);
  }
}
```

## 📋 Response Patterns

### Success Responses
All successful responses should include cost and licensing headers:

```javascript
const successHeaders = {
  'X-Peek-Cost': costInCurrency,
  'X-Peek-Tool-Used': toolName,
  'X-Peek-License-Remaining': remainingBudget,
  'X-Peek-Processing': enforcementMethod // 'trust' or 'tool_required'
};
```

### Error Responses

**402 Payment Required (No License):**
```javascript
return new Response(JSON.stringify(peekJsonConfig), {
  status: 402,
  headers: {
    'Content-Type': 'application/json',
    'X-Peek-Discovery': 'reactive'
  }
});
```

**403 Forbidden (Tool Not Allowed):**
```javascript
return new Response(JSON.stringify({
  error: 'tool_not_allowed',
  message: `Tool '${tool}' is not permitted for this content`,
  allowed_tools: Object.keys(peekConfig.license.tools).filter(t => 
    peekConfig.license.tools[t].allowed
  )
}), {
  status: 403,
  headers: { 'Content-Type': 'application/json' }
});
```

**429 Too Many Requests (Quota Exceeded):**
```javascript
return new Response(JSON.stringify({
  error: 'quota_exceeded',
  message: 'License quota exceeded for this tool',
  retry_after: 3600,
  top_up_url: `${LICENSE_API_URL}/licenses/${licenseId}/topup`
}), {
  status: 429,
  headers: {
    'Content-Type': 'application/json',
    'Retry-After': '3600'
  }
});
```

## 🛠️ Platform-Specific Implementation

### Cloudflare Workers
```javascript
export default {
  async fetch(request, env, ctx) {
    const peekConfig = await env.KV.get('peek-config', 'json');
    const botDetection = await detectBot(request, env.BOT_DETECTION_API);
    
    if (botDetection.isBot) {
      return await handleBotRequest(request, peekConfig);
    }
    
    // Handle regular traffic
    return await fetch(request);
  }
};
```

### AWS Lambda@Edge
```javascript
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const botDetection = await detectBot(request);
  
  if (botDetection.isBot) {
    return await handleBotRequest(request);
  }
  
  return request; // Continue to origin
};
```

### Fastly VCL
```vcl
sub vcl_recv {
  if (req.http.User-Agent ~ "(?i)(bot|crawler|AI|GPT)") {
    set req.http.X-Is-Bot = "true";
  }
}

sub vcl_deliver {
  if (req.http.X-Is-Bot == "true") {
    call peek_license_check;
  }
}
```

## 🔧 Configuration Management

### Environment Variables
```bash
# License API Configuration
PEEK_LICENSE_API_URL=https://api.example.com/license
PEEK_LICENSE_API_KEY=your_api_key

# Bot Detection Service
PEEK_BOT_DETECTION_SERVICE=cloudflare_bot_management
PEEK_BOT_DETECTION_API_KEY=your_detection_key

# Tool Service Endpoints (Internal)
PEEK_TOOL_SUMMARIZE_URL=https://internal.example.com/summarize
PEEK_TOOL_EMBEDDINGS_URL=https://internal.example.com/embeddings

# Enforcement Settings
PEEK_RATE_LIMIT_PER_IP=100
PEEK_GRACE_PERIOD_SECONDS=300
PEEK_FAILOVER_MODE=deny
```

### Dynamic Configuration
```javascript
// Load peek.json configuration with caching
async function loadPeekConfig(domain) {
  const cacheKey = `peek-config:${domain}`;
  let config = await cache.get(cacheKey);
  
  if (!config) {
    const response = await fetch(`https://${domain}/.well-known/peek.json`);
    config = await response.json();
    
    // Cache for 1 hour
    await cache.put(cacheKey, config, { expirationTtl: 3600 });
  }
  
  return config;
}
```

## 📊 Monitoring and Logging

### Usage Tracking
```javascript
async function recordUsage(licenseId, tool, url, contentSize) {
  const usage = {
    timestamp: new Date().toISOString(),
    license_id: licenseId,
    tool: tool,
    url: url,
    content_size_bytes: contentSize,
    cost: calculateCost(tool, contentSize)
  };
  
  // Send to license API
  await fetch(`${LICENSE_API_URL}/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usage)
  });
  
  // Log for analytics
  console.log('peek-usage', usage);
}
```

### Error Logging
```javascript
async function logError(request, error, context) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    url: request.url,
    user_agent: request.headers.get('User-Agent'),
    error: error.message,
    context: context
  };
  
  console.error('peek-error', logEntry);
}
```

## 🚀 Production Deployment

### Security Checklist
- ✅ **Tool services** are internal-only, never publicly accessible
- ✅ **JWT secrets** are properly secured and rotated
- ✅ **Bot detection** is integrated with professional service
- ✅ **Rate limiting** is configured per peek.json settings
- ✅ **Audit logging** captures all license validations
- ✅ **Failover modes** are tested and documented

### Performance Optimization
- **Caching**: Cache peek.json configs with appropriate TTL
- **Connection Pooling**: Reuse connections to license API
- **Async Processing**: Handle usage recording asynchronously
- **Geographic Distribution**: Deploy edge workers globally

### Complete Implementation

For production-ready implementations including deployment automation, comprehensive testing, and monitoring dashboards, see the [peek-enforcer](https://github.com/PeekThenPay/peek-enforcer) project which provides:

- Complete edge worker implementations for major platforms
- Automated deployment pipelines
- Integration examples with popular bot detection services
- Performance monitoring and alerting
- Comprehensive test suites

---

**Remember**: This guide provides recommended patterns. The peek.json standard is implementation-agnostic, and publishers can use any technology stack that correctly implements the specification requirements.