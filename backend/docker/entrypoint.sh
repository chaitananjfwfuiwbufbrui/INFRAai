#!/bin/sh
set -e

cd /workspace

echo "=== PHASE: INIT ==="
terraform init -input=false

echo "=== PHASE: PLAN ==="
terraform plan -input=false

if [ "$TF_ACTION" = "destroy" ]; then
  echo "=== PHASE: DESTROY ==="
  terraform destroy -auto-approve -input=false
else
  echo "=== PHASE: APPLY ==="
  terraform apply -auto-approve -input=false
fi

echo "=== PHASE: COMPLETE ==="
