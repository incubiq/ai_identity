## WHY WE NEED THIS: F£$@ Identus changed config and required access to sole Creds in HTTPS mode, all calls fail so we built our own HTTPS Server to work around... 
## this part is for building our cloud-agent container and BYPASS JVM HTTPS higher security (without this, we still hit the problem of Identus failing our POST calls)

# Start from the official Identus Cloud Agent image

ARG AGENT_VERSION

FROM ghcr.io/hyperledger/identus-cloud-agent:${AGENT_VERSION}

USER root

# Copy the self-signed certificate into the system's trust source directory

# This step happens DURING THE IMAGE BUILD, where you have write permissions.

COPY www.w3.org.crt /etc/pki/ca-trust/source/anchors/


# Run the update-ca-trust command DURING THE IMAGE BUILD

# This rebuilds the cacerts file and other system trust stores

RUN update-ca-trust extract


# The original image's ENTRYPOINT and CMD are preserved by default.

# For reference, the original image likely has:

# ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# CMD ["java", "-jar", "/opt/identus/lib/cloud-agent-bootstrap.jar"]

# No need to put them here unless you want to change them.
