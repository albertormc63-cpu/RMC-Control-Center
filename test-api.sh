#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:3000"

echo "1) Health check"
curl -fsS "$BASE_URL/health" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(data)'

echo "\n2) Dashboard"
curl -fsS "$BASE_URL/api/dashboard" | python3 -c 'import sys, json; data=json.load(sys.stdin); print({"toolsCount":data.get("toolsCount"),"nikeRuns":data.get("nike",{}).get("runs"),"mockupRuns":data.get("mockup",{}).get("runs")})'

echo "\n3) Nike runs"
curl -fsS "$BASE_URL/api/nike/runs" | python3 -c 'import sys, json; data=json.load(sys.stdin); runs = data["runs"] if isinstance(data, dict) and "runs" in data else data; print({"page":data.get("page") if isinstance(data, dict) else 1,"limit":data.get("limit") if isinstance(data, dict) else len(runs),"count":len(runs)})'

echo "\n4) Mockup runs"
curl -fsS "$BASE_URL/api/mockup/runs" | python3 -c 'import sys, json; data=json.load(sys.stdin); runs = data["runs"] if isinstance(data, dict) and "runs" in data else data; print({"page":data.get("page") if isinstance(data, dict) else 1,"limit":data.get("limit") if isinstance(data, dict) else len(runs),"count":len(runs)})'

echo "\n5) Report Excel Nike"
firstNikeId=$(curl -fsS "$BASE_URL/api/nike/runs" | python3 -c 'import sys,json; data=json.load(sys.stdin); runs = data.get("runs") if isinstance(data,dict) else data; print(runs[0]["id"] if runs else "")')
if [ -z "$firstNikeId" ]; then
  echo "No Nike runs available to test Excel export"
  exit 1
fi
response=$(mktemp)
http_code=$(curl -fsS -o "$response" -w "%{http_code}" "$BASE_URL/api/reports/nike/${firstNikeId}/excel" 2>/dev/null || true)
if [ "$http_code" = "200" ]; then
  echo "Nike report downloaded: $(wc -c < "$response") bytes"
else
  echo "Nike report failed with code $http_code"
  rm -f "$response"
  exit 1
fi
rm -f "$response"

echo "\n6) Report Excel MockupTool"
firstMockupId=$(curl -fsS "$BASE_URL/api/mockup/runs" | python3 -c 'import sys,json; data=json.load(sys.stdin); runs = data.get("runs") if isinstance(data,dict) else data; print(runs[0]["id"] if runs else "")')
if [ -z "$firstMockupId" ]; then
  echo "No Mockup runs available to test Excel export"
  exit 1
fi
response=$(mktemp)
http_code=$(curl -fsS -o "$response" -w "%{http_code}" "$BASE_URL/api/reports/mockup/${firstMockupId}/excel" 2>/dev/null || true)
if [ "$http_code" = "200" ]; then
  echo "Mockup report downloaded: $(wc -c < "$response") bytes"
else
  echo "Mockup report failed with code $http_code"
  rm -f "$response"
  exit 1
fi
rm -f "$response"

echo "\nAPI smoke test completed successfully."
