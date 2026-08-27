#!/bin/bash
IDS="3304865293754141577 15242269010035803487 16742037383640771090 11114947413066514852 625869517576709152"
for i in $(seq 1 60); do
  OUT=$(jules remote list --session 2>/dev/null)
  DONE=0; PENDING=""
  for id in $IDS; do
    LINE=$(echo "$OUT" | grep -- "$id")
    if echo "$LINE" | grep -qE "Completed|Failed"; then
      DONE=$((DONE+1))
    else
      PENDING="$PENDING $id"
    fi
  done
  echo "[$(date +%H:%M:%S)] 완료 $DONE/5${PENDING:+ · 남은:$PENDING}"
  if [ "$DONE" -eq 5 ]; then echo "=== 전부 종료 ==="; echo "$OUT"; exit 0; fi
  sleep 90
done
echo "=== 90분 지나도 안 끝난 것이 있다 ==="
jules remote list --session 2>/dev/null
