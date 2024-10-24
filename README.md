# Project Overview

 - Initial project proposal and specs can be found here: https://cardano.ideascale.com/c/idea/112964
 - Project managewment dashboard is here: https://milestones.projectcatalyst.io/projects/1100164/

# Milestones 
 1a/ (March):
 - video report: https://youtu.be/9zihWh4ZRi8 
 - additional video report for VC / PRISM issue: https://youtu.be/Iq1tMPdLraU

 1b/ (April):
 - video report: https://youtu.be/u_ufSn_7UR8 
 - project specs: https://github.com/incubiq/ai_identity/blob/main/specs.txt

 2/ (June):
 - video report: https://youtu.be/tG_X_iB81TQ 
 - Identity Node repo updated and functional (wallet creation, entity creation, DID, shemas, definitions, VC offers, Presentation requests, Proof of Claims...) 

 3/ (Sept)
 - Identity Node repo updated and functional with APIs supporting Non-Custodial and Custodial mode
 - Identus issues reported
 - video report: https://youtu.be/n1ZpTRr5Mhw

 4/ (planned for Dec)


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
12. install locally a Identity Agent (such as v 1.28.0): https://github.com/hyperledger/identus/releases/tag/prism-agent-v1.28.0  

Then, if you want to run it locally as a program (not using docker), you will need more setup. Basically follow this extra steps (note: I am only using docker containers, so this part is not tested, just given as first indication):

 - install java jdk:  sudo apt-get install openjdk-8-jre
 - install sbt: see here https://www.scala-sbt.org/1.x/docs/Installing-sbt-on-Linux.html
    sudo apt-get update
    sudo apt-get install apt-transport-https curl gnupg -yqq
    echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
    echo "deb https://repo.scala-sbt.org/scalasbt/debian /" | sudo tee /etc/apt/sources.list.d/sbt_old.list
    curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | sudo -H gpg --no-default-keyring --keyring gnupg-ring:/etc/apt/trusted.gpg.d/scalasbt-release.gpg --import
    sudo chmod 644 /etc/apt/trusted.gpg.d/scalasbt-release.gpg
    sudo apt-get update
    sudo apt-get install sbt

After this pre-install, it should work with those commands

=> open a wsl terminal

=> cd open-enterprise-agent-main

=> then go to the latest version (ex:   cd v1.39.1 )

// to run it (on port 8100)

// with v1.31.0  (last PRISM Agent)

```
DOCKERHOST=host.docker.internal ADMIN_TOKEN=my-admin-token API_KEY_ENABLED=true API_KEY_AUTO_PROVISIONING=false API_KEY_AUTHENTICATE_AS_DEFAULT_USER=false DEFAULT_WALLET_ENABLED=false PORT=8100 PRISM_AGENT_VERSION=1.31.0 PRISM_NODE_VERSION=2.2.1 VAULT_DEV_ROOT_TOKEN_ID=root PG_PORT=5432  docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml  up --wait
```

// with v1.39.1 (latest Identus agent -- note : keep 1.39.0 in VERSION= or it will fail...)

```
DOCKERHOST=host.docker.internal ADMIN_TOKEN=my-admin-token API_KEY_ENABLED=true API_KEY_AUTO_PROVISIONING=false API_KEY_AUTHENTICATE_AS_DEFAULT_USER=false DEFAULT_WALLET_ENABLED=false PORT=8100 AGENT_VERSION=1.39.0 PRISM_NODE_VERSION=2.3.0 VAULT_DEV_ROOT_TOKEN_ID=root PG_PORT=5432  docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml  up --wait
```

// to shut it down: 

```
docker compose -p "issuer"  -f ./infrastructure/shared/docker-compose.yml down 
```


// to tunnel the local Identity Cloud:

cloudflared tunnel --url http://localhost:8100


// to inspect
```
 docker logs issuer-prism-agent-1 
 docker volume rm issuer_pg_data_db
 docker volume prune
```


// to clear the DB and restart from scratch  (after a compose down)

... todo...


// to check for health

=> wsl

=> PRISM:    curl http://localhost:8100/prism-agent/_system/health

=> IDENTUS:  curl http://localhost:8100/cloud-agent/_system/health


# How to host an Identus Agent in Prod (for example on AWS)

 - git clone https://github.com/hyperledger/identus-cloud-agent.git
 - in /identus-cloud-agent, create a .reset_identus.sh with this content: 

 ```
docker compose -p "issuer"  -f ./identus-cloud-agent/infrastructure/shared/docker-compose.yml down 
 
 DOCKERHOST=host.docker.internal ADMIN_TOKEN=change-this-admin-token API_KEY_ENABLED=true API_KEY_AUTO_PROVISIONING=false API_KEY_AUTHENTICATE_AS_DEFAULT_USER=false DEFAULT_WALLET_ENABLED=false PORT=8100 AGENT_VERSION=1.39.0 PRISM_NODE_VERSION=2.3.0 VAULT_DEV_ROOT_TOKEN_ID=root PG_PORT=5432  docker compose -p "issuer"  -f ./identus-cloud-agent/infrastructure/shared/docker-compose.yml  up --wait
```

 - add a nginx proxy in reverse mode: 

```
sudo docker network rm nginx-proxy
sudo docker network create nginx-proxy
sudo docker run -d -p 80:80 -p 443:443 --name nginx-proxy --net nginx-proxy -v /var/run/docker.sock:/tmp/docker.sock:ro jwilder/nginx-proxy
```

 - The docker-compose.yml of the agent needs updates...

The key insight is to understand the proper routing chain:

CopyInternet -> nginx-proxy (port 80) -> APISIX (port 9080) -> cloud-agent (ports 8085/8090)

APISIX is the proper entry point as it manages complex routing rules. 
We have to define VIRTUAL_HOST into APISIX service,  aligned the routing hierarchy
Keeping both services on the nginx-proxy network to enable communication
Preserving existing APISIX routing configuration


Security benefits of this setup:

   - cloud-agent isn't directly exposed to nginx-proxy
   - APISIX maintains control over all routing rules in one place
   - The setup preserves your CORS and proxy-rewrite configurations

Here the changes:
   - at the end of the  [cloud-agent:] section add this:

```
      expose:
      - "8085"
      - "8090"
      networks:
      - default
      - nginx-proxy
```

   - at the end of the  [apisix:] section add this:

```
      environment:
        VIRTUAL_HOST: identus.opensourceais.com ## add your identus hosted domain here
        VIRTUAL_PORT: 9080
      expose:
        - "9080"  
      networks:
        - default
        - nginx-proxy
    # comment the ports
    # ports:
    #   - "${PORT}:9080/tcp"
```

  - at the bottom of the file, add this:

```
      networks:
        default:
          name: issuer-default
        nginx-proxy:
          external: true
```

  - Use Internal Docker DNS: Update the Cloud Agent's environment variables to use the internal Docker service name instead of host.docker.internal:

  POLLUX_STATUS_LIST_REGISTRY_PUBLIC_URL: http://apisix:9080/cloud-agent

  DIDCOMM_SERVICE_URL: http://apisix:9080/didcomm

  REST_SERVICE_URL: http://apisix:9080/cloud-agent

  - add the "identus" subdomain in your DNS

How to test it:
 curl -H "Host: identus.opensourceais.com" http://localhost/cloud-agent/_system/health

NOTE : this is a config for HTTP (not for HTTPS). Assuming a cloudflare SSL / Edge certificate

# Other/Misc helpers for wsl

 - check ubuntu version : lsb_release -a
 - upgrade ubuntu version : 1/ sudo do-release-upgrade   ; 2/ # restart Ubuntu  ;  3/ sudo do-release-upgrade
 - which Ubuntu versions available on WSL ? : wsl --list --online
 - which Ubuntu on my WSL ? : wsl --list --verbose
 - set default Ubuntu on my WSL : wsl --set-default  Ubuntu-22.04
