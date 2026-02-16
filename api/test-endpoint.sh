#!/bin/bash

# Test script for Gemini Vision API Backend
# Usage: ./test-endpoint.sh <jwt_token> <image_path>

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
ENDPOINT="$API_URL/api/report/analyze"

# Check arguments
if [ "$#" -lt 2 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 <jwt_token> <image_path>"
    echo ""
    echo "Example:"
    echo "  $0 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' ./test_image.jpg"
    exit 1
fi

JWT_TOKEN="$1"
IMAGE_PATH="$2"

# Check if image exists
if [ ! -f "$IMAGE_PATH" ]; then
    echo -e "${RED}Error: Image file not found: $IMAGE_PATH${NC}"
    exit 1
fi

# Check image size
IMAGE_SIZE=$(stat -f%z "$IMAGE_PATH" 2>/dev/null || stat -c%s "$IMAGE_PATH" 2>/dev/null)
MAX_SIZE=$((5 * 1024 * 1024)) # 5MB

if [ "$IMAGE_SIZE" -gt "$MAX_SIZE" ]; then
    echo -e "${RED}Error: Image size exceeds 5MB limit${NC}"
    echo "Image size: $(($IMAGE_SIZE / 1024 / 1024))MB"
    exit 1
fi

# Check image type
IMAGE_TYPE=$(file -b --mime-type "$IMAGE_PATH")
if [[ ! "$IMAGE_TYPE" =~ ^image/(jpeg|png)$ ]]; then
    echo -e "${YELLOW}Warning: Image type is $IMAGE_TYPE (expected image/jpeg or image/png)${NC}"
fi

echo -e "${GREEN}Testing Gemini Vision API Backend${NC}"
echo "=================================="
echo "Endpoint: $ENDPOINT"
echo "Image: $IMAGE_PATH"
echo "Size: $(($IMAGE_SIZE / 1024))KB"
echo "Type: $IMAGE_TYPE"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"healthy"')

if [ -n "$HEALTH_STATUS" ]; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
else
    echo -e "${RED}✗ Server health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Analyze Image
echo -e "${YELLOW}Test 2: Analyze Image${NC}"
echo "Sending request..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "title=Test Issue - $(date +%Y%m%d%H%M%S)" \
  -F "image=@$IMAGE_PATH")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all but last line)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓ Request successful!${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
    
    # Extract key information
    ISSUE_TYPE=$(echo "$BODY" | grep -o '"issue_type":"[^"]*"' | cut -d'"' -f4)
    CONFIDENCE=$(echo "$BODY" | grep -o '"confidence_score":[0-9]*' | cut -d':' -f2)
    SEVERITY=$(echo "$BODY" | grep -o '"severity_level":"[^"]*"' | cut -d'"' -f4)
    IS_VALID=$(echo "$BODY" | grep -o '"is_valid_issue":[a-z]*' | cut -d':' -f2)
    
    echo -e "${GREEN}Analysis Summary:${NC}"
    echo "  Issue Type: $ISSUE_TYPE"
    echo "  Confidence: $CONFIDENCE%"
    echo "  Severity: $SEVERITY"
    echo "  Valid Issue: $IS_VALID"
    
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Response: $BODY"
    echo ""
    echo "Possible issues:"
    echo "  - Invalid JWT token"
    echo "  - Expired token"
    echo "  - Wrong JWT_SECRET in .env"
    
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${RED}✗ Bad request${NC}"
    echo "Response: $BODY"
    echo ""
    echo "Possible issues:"
    echo "  - Invalid image format"
    echo "  - Image too large"
    echo "  - Missing required fields"
    
elif [ "$HTTP_CODE" -eq 503 ]; then
    echo -e "${RED}✗ Service unavailable${NC}"
    echo "Response: $BODY"
    echo ""
    echo "Possible issues:"
    echo "  - Gemini API is down"
    echo "  - Invalid GEMINI_API_KEY"
    echo "  - Rate limit exceeded"
    
else
    echo -e "${RED}✗ Request failed${NC}"
    echo "Response: $BODY"
fi

echo ""
echo "=================================="
echo -e "${GREEN}Test complete!${NC}"
