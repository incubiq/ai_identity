
1/ try running "Open Enterprise Agent" in docker / linux as Issuer and Holder

1a/ First terminal session
=> wsl
=> cd open-enterprise-agent-main
=> then go to the latest version (ex:   cd v1.31.0 )
=> cd infrastructure/local

=> echo "DOCKERHOST=host.docker.internal ADMIN_TOKEN=my-admin-token API_KEY_ENABLED=true API_KEY_AUTO_PROVISIONING=false API_KEY_AUTHENTICATE_AS_DEFAULT_USER=false DEFAULT_WALLET_ENABLED=false PORT=8100 NETWORK=prism PRISM_AGENT_VERSION=1.31.0 PRISM_NODE_VERSION=2.2.1 VAULT_DEV_ROOT_TOKEN_ID=root PG_PORT=5432" > .env

=> export DOCKERHOST=192.168.1.83
=> DOCKERHOST=host.docker.internal ADMIN_TOKEN=my-admin-token API_KEY_ENABLED=true API_KEY_AUTO_PROVISIONING=false API_KEY_AUTHENTICATE_AS_DEFAULT_USER=false DEFAULT_WALLET_ENABLED=false PORT=8100 PRISM_AGENT_VERSION=1.28.0 PRISM_NODE_VERSION=2.2.1 VAULT_DEV_ROOT_TOKEN_ID=root PG_PORT=5432  docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml  up --wait
=> docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml down 

=> DOCKERHOST=192.168.1.83 DIDCOMM_SERVICE_URL=http://192.168.1.83:8100/didcomm ADMIN_TOKEN=my-admin-token API_KEY_ENABLED=true API_KEY_AUTO_PROVISIONING=false API_KEY_AUTHENTICATE_AS_DEFAULT_USER=false DEFAULT_WALLET_ENABLED=false PORT=8100 PRISM_AGENT_VERSION=1.30.1 PRISM_NODE_VERSION=2.2.1  docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml up --wait

=> as prog:  ./run.sh -n issuer -p 8100
=> docker logs issuer-prism-agent-1


1b/ for checks / tests
=> wsl
=> curl http://localhost:8100/prism-agent/_system/health
=> curl http://localhost:8101/prism-agent/_system/health

=> curl -X 'GET'   'http://localhost:8100/prism-agent/wallets'   -H 'accept: application/json'   -H 'x-admin-api-key:my-admin-token'

Misc:
===============

 - check ubuntu version : lsb_release -a
 - upgrade ubuntu version : 1/ sudo do-release-upgrade   ; 2/ # restart Ubuntu  ;  3/ sudo do-release-upgrade
 - which Ubuntu versions available on WSL ? : wsl --list --online
 - which Ubuntu on my WSL ? : wsl --list --verbose
 - set default Ubuntu on my WSL : wsl --set-default  Ubuntu-22.04