#!/bin/bash

# Test script for Resolution Verification System
# Usage: ./test-verification.sh <worker_jwt_token> <report_id> <image_path> <lat> <lng>

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
ENDPOINT="$API_URL/api/report"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Resolution Verification System - Test Script            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check arguments
if [ "$#" -lt 5 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 <worker_jwt_token> <report_id> <image_path> <lat> <lng>"
    echo ""
    echo "Example:"
    echo "  $0 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \\"
    echo "     'abc-123-def-456' \\"
    echo "     './after_image.jpg' \\"
    echo "     '40.7128' \\"
    echo "     '-74.0060'"
    exit 1
fi

JWT_TOKEN="$1"
REPORT_ID="$2"
IMAGE_PATH="$3"
LATITUDE="$4"
LONGITUDE="$5"

# Validate inputs
echo -e "${YELLOW}Validating inputs...${NC}"

# Check if image exists
if [ ! -f "$IMAGE_PATH" ]; then
    echo -e "${RED}✗ Error: Image file not found: $IMAGE_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Image file found${NC}"

# Check image size
IMAGE_SIZE=$(stat -f%z "$IMAGE_PATH" 2>/dev/null || stat -c%s "$IMAGE_PATH" 2>/dev/null)
MAX_SIZE=$((5 * 1024 * 1024)) # 5MB

if [ "$IMAGE_SIZE" -gt "$MAX_SIZE" ]; then
    echo -e "${RED}✗ Error: Image size exceeds 5MB limit${NC}"
    echo "  Image size: $(($IMAGE_SIZE / 1024 / 1024))MB"
    exit 1
fi
echo -e "${GREEN}✓ Image size OK: $(($IMAGE_SIZE / 1024))KB${NC}"

# Check image type
IMAGE_TYPE=$(file -b --mime-type "$IMAGE_PATH")
if [[ ! "$IMAGE_TYPE" =~ ^image/(jpeg|png)$ ]]; then
    echo -e "${YELLOW}⚠ Warning: Image type is $IMAGE_TYPE (expected image/jpeg or image/png)${NC}"
fi
echo -e "${GREEN}✓ Image type: $IMAGE_TYPE${NC}"

# Validate coordinates
if ! [[ "$LATITUDE" =~ ^-?[0-9]+\.?[0-9]*$ ]] || ! [[ "$LONGITUDE" =~ ^-?[0-9]+\.?[0-9]*$ ]]; then
    echo -e "${RED}✗ Error: Invalid GPS coordinates${NC}"
    exit 1
fi
echo -e "${GREEN}✓ GPS coordinates valid${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  Report ID: $REPORT_ID"
echo "  Image: $IMAGE_PATH"
echo "  Size: $(($IMAGE_SIZE / 1024))KB"
echo "  Type: $IMAGE_TYPE"
echo "  Latitude: $LATITUDE"
echo "  Longitude: $LONGITUDE"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[1/3] Testing server health...${NC}"
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

# Test 2: Verify Resolution
echo -e "${YELLOW}[2/3] Submitting resolution verification...${NC}"
echo "Endpoint: $ENDPOINT/$REPORT_ID/verify-resolution"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT/$REPORT_ID/verify-resolution" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "image=@$IMAGE_PATH" \
  -F "lat=$LATITUDE" \
  -F "lng=$LONGITUDE")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all but last line)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

# Test 3: Analyze Response
echo -e "${YELLOW}[3/3] Analyzing response...${NC}"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓ Request successful!${NC}"
    echo ""
    echo -e "${BLUE}Response:${NC}"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
    
    # Extract key information
    SUCCESS=$(echo "$BODY" | grep -o '"success":true')
    VERIFICATION_STATUS=$(echo "$BODY" | grep -o '"verification_status":"[^"]*"' | cut -d'"' -f4)
    IS_SUSPICIOUS=$(echo "$BODY" | grep -o '"is_suspicious":[a-z]*' | cut -d':' -f2)
    LOCATION_MATCH=$(echo "$BODY" | grep -o '"location_match":[a-z]*' | cut -d':' -f2)
    LOCATION_DISTANCE=$(echo "$BODY" | grep -o '"location_distance":"[^"]*"' | cut -d'"' -f4)
    IMAGE_SIMILARITY=$(echo "$BODY" | grep -o '"image_similarity":"[^"]*"' | cut -d'"' -f4)
    AI_CONFIDENCE=$(echo "$BODY" | grep -o '"ai_confidence":[0-9]*' | cut -d':' -f2)
    SAME_LOCATION=$(echo "$BODY" | grep -o '"same_location":[a-z]*' | cut -d':' -f2)
    ISSUE_RESOLVED=$(echo "$BODY" | grep -o '"issue_resolved":[a-z]*' | cut -d':' -f2)
    
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Verification Summary:${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    
    if [ "$VERIFICATION_STATUS" = "verified" ]; then
        echo -e "  Status: ${GREEN}✓ VERIFIED${NC}"
    else
        echo -e "  Status: ${RED}✗ SUSPICIOUS${NC}"
    fi
    
    echo "  Suspicious: $IS_SUSPICIOUS"
    echo ""
    echo -e "${YELLOW}Location Verification:${NC}"
    echo "  Match: $LOCATION_MATCH"
    echo "  Distance: $LOCATION_DISTANCE"
    echo ""
    echo -e "${YELLOW}Image Analysis:${NC}"
    echo "  Similarity: $IMAGE_SIMILARITY"
    echo ""
    echo -e "${YELLOW}AI Verification:${NC}"
    echo "  Confidence: $AI_CONFIDENCE%"
    echo "  Same Location: $SAME_LOCATION"
    echo "  Issue Resolved: $ISSUE_RESOLVED"
    
    # Check for suspicion flags
    SUSPICION_FLAGS=$(echo "$BODY" | grep -o '"suspicion_flags":\[[^]]*\]')
    if [ -n "$SUSPICION_FLAGS" ] && [ "$SUSPICION_FLAGS" != '"suspicion_flags":null' ]; then
        echo ""
        echo -e "${RED}Suspicion Flags:${NC}"
        echo "$BODY" | grep -A 10 '"suspicion_flags"' | grep -o '"[^"]*"' | tail -n +2 | while read flag; do
            echo "  • $flag"
        done
    fi
    
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${RED}✗ Bad Request${NC}"
    echo "Response: $BODY"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  • Invalid image format"
    echo "  • Image too large"
    echo "  • Missing required fields"
    echo "  • Report already resolved"
    echo "  • Duplicate submission"
    
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Response: $BODY"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  • Invalid JWT token"
    echo "  • Expired token"
    echo "  • Wrong JWT_SECRET in .env"
    
elif [ "$HTTP_CODE" -eq 403 ]; then
    echo -e "${RED}✗ Access denied${NC}"
    echo "Response: $BODY"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  • User is not a worker/official"
    echo "  • Insufficient permissions"
    
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${RED}✗ Report not found${NC}"
    echo "Response: $BODY"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  • Invalid report ID"
    echo "  • Report doesn't exist"
    
elif [ "$HTTP_CODE" -eq 503 ]; then
    echo -e "${RED}✗ Service unavailable${NC}"
    echo "Response: $BODY"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  • Gemini API is down"
    echo "  • Invalid GEMINI_API_KEY"
    echo "  • Rate limit exceeded"
    
else
    echo -e "${RED}✗ Request failed${NC}"
    echo "Response: $BODY"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Test complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
