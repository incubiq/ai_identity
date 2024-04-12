# Project Overview

 - Initial project proposal and specs can be found here: https://cardano.ideascale.com/c/idea/112964
 - Project managewment dashboard is here: https://milestones.projectcatalyst.io/projects/1100164/

# Milestones 
 1a/ (March):
 - video report: https://youtu.be/9zihWh4ZRi8 
 - additional video report for VC / PRISM issue: https://youtu.be/Iq1tMPdLraU

 1b/ (April):
 - video report: 


# Identus test scripts
 - up to date in repo

# How to setup an Identus Agent

I ran into some issues with DidComm not working with a first setup, then recreated from scratch with this guide, and it "worked". This is for a Windows WSL config.

1. Open cmd and type “wsl” to login into WSL
2. sudo apt update 
3. sudo apt -y upgrade
4. sudo apt -y install apt-transport-https ca-certificates curl software-properties-common 
5. curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
6. echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
7. sudo apt update 
8. sudo apt -y install docker-ce docker-ce-cli containerd.io 
9. sudo usermod -aG docker $USER
10. newgrp docker 
11. docker run hello-world
12. install locally a Identy Agent (such as v 1.28.0): https://github.com/hyperledger/identus/releases/tag/prism-agent-v1.28.0  

After this pre-install, it should work with those commands

=> open a wsl terminal
=> cd open-enterprise-agent-main
=> then go to the latest version (ex:   cd v1.28.0 )
=> cd infrastructure/local

// to run it (on port 8100)
=> DOCKERHOST=host.docker.internal ADMIN_TOKEN=my-admin-token API_KEY_ENABLED=true API_KEY_AUTO_PROVISIONING=false API_KEY_AUTHENTICATE_AS_DEFAULT_USER=false DEFAULT_WALLET_ENABLED=false PORT=8100 PRISM_AGENT_VERSION=1.28.0 PRISM_NODE_VERSION=2.2.1 VAULT_DEV_ROOT_TOKEN_ID=root PG_PORT=5432  docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml  up --wait

// to shut it down
=> docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml down 

// to inspect
=> docker logs issuer-prism-agent-1

// to check for health
=> wsl
=> curl http://localhost:8100/prism-agent/_system/health


Misc helpers for wsl

 - check ubuntu version : lsb_release -a
 - upgrade ubuntu version : 1/ sudo do-release-upgrade   ; 2/ # restart Ubuntu  ;  3/ sudo do-release-upgrade
 - which Ubuntu versions available on WSL ? : wsl --list --online
 - which Ubuntu on my WSL ? : wsl --list --verbose
 - set default Ubuntu on my WSL : wsl --set-default  Ubuntu-22.04
