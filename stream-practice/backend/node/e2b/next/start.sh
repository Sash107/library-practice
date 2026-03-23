
function ping_server() {
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
  while [[ ${response} -ne 200 ]]; do
    sleep 0.1
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
  done
  echo "Server ready!"
}

ping_server &
cd /home/user/myapp && npx next dev --turbopack