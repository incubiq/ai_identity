#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# This is the directory where system-wide custom certificates are placed
# on systems using the 'ca-trust' mechanism (like RHEL/CentOS/Fedora, which this image seems to use)
SYSTEM_TRUST_ANCHORS_DIR="/etc/pki/ca-trust/source/anchors/"

# The path to your certificate inside the container, as mounted from your host
MOUNTED_CERT_PATH="/certs/www.w3.org.crt"

# The name we want for the certificate when it's placed in the system's trust source
TARGET_CERT_NAME="www.w3.org.crt" # Keep the same name or rename if preferred

echo "--- Custom entrypoint: Starting system-level certificate trust update process ---"

# Ensure the target directory exists (it should, but good practice)
mkdir -p "$SYSTEM_TRUST_ANCHORS_DIR"

# Copy your self-signed certificate into the system's trust source directory
echo "Copying '$MOUNTED_CERT_PATH' to '$SYSTEM_TRUST_ANCHORS_DIR$TARGET_CERT_NAME'..."
cp "$MOUNTED_CERT_PATH" "$SYSTEM_TRUST_ANCHORS_DIR$TARGET_CERT_NAME"

# Update the system-wide CA trust store. This command rebuilds all derived trust stores, including Java's cacerts.
echo "Updating system CA trust store with 'update-ca-trust extract'..."
update-ca-trust extract

# Check the exit status of the update command
if [ $? -eq 0 ]; then
    echo "System CA trust store updated successfully. Your certificate should now be trusted."
else
    echo "ERROR: Failed to update system CA trust store. Please check the output above for details."
    # Optionally, you might want to exit here if this is a critical dependency
    # exit 1
fi

echo "--- Custom entrypoint: Certificate trust process complete. Starting original Identus entrypoint. ---"

# Execute the original entrypoint/command of the Identus cloud-agent image.
exec "$@"