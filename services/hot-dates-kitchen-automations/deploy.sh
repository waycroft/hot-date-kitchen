#!/bin/bash

# deploy.sh - Zero-downtime deployment script
# Can be run locally or in GitHub Actions

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required environment variables
check_env_vars() {
    local missing_vars=()

    if [ -z "$EC2_HOST" ]; then missing_vars+=("EC2_HOST"); fi
    if [ -z "$EC2_USER" ]; then missing_vars+=("EC2_USER"); fi
    if [ -z "$APP_NAME" ]; then missing_vars+=("APP_NAME"); fi
    if [ -z "$EC2_SSH_KEY" ]; then missing_vars+=("EC2_SSH_KEY"); fi

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        echo "Required variables:"
        echo "  EC2_HOST - EC2 server hostname or IP"
        echo "  EC2_USER - SSH username"
        echo "  APP_NAME - Application/service name"
        echo "  EC2_SSH_KEY - SSH private key content"
        echo "Optional variables:"
        echo "  SERVICE_USER - User that owns the service files (defaults to APP_NAME if not set)"
        exit 1
    fi
}

create_deployment_package() {
    log_info "Creating source package..."
    rm -f source.tar.gz
	tar -czf source.tar.gz --no-xattrs --exclude-from=".gitignore" .
}

# Check if deployment package exists
check_deployment_package() {
    if [ ! -f "source.tar.gz" ]; then
        log_error "Source package 'source.tar.gz' not found"
        log_info "Run the script to create the package first"
        exit 1
    fi
    log_info "Found source package: source.tar.gz"
}

# Setup SSH key
setup_ssh_key() {
    log_info "Setting up SSH key..."
    echo "$EC2_SSH_KEY" > private_key.pem
    chmod 600 private_key.pem
    log_info "SSH key configured"
}

# Copy deployment package to server
copy_package() {
    log_info "Copying source package to server..."
    scp -i private_key.pem -o StrictHostKeyChecking=no \
        source.tar.gz ${EC2_USER}@${EC2_HOST}:/tmp/
    log_info "Package copied successfully"
}

# Deploy on server with zero downtime
deploy_on_server() {
    log_info "Starting zero-downtime deployment on server..."

    ssh -i private_key.pem -o StrictHostKeyChecking=no \
        ${EC2_USER}@${EC2_HOST} << EOF

        set -e

        # Set variables
        BASE_DIR="/opt/${APP_NAME}"
        SERVICE_NAME="${APP_NAME}"
        SERVICE_USER="${SERVICE_USER}"
        TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
        NEW_RELEASE_DIR="\${BASE_DIR}/releases/\${TIMESTAMP}"
        CURRENT_LINK="\${BASE_DIR}/current"

        echo "[INFO] Using base directory: \${BASE_DIR}"
        echo "[INFO] Using service user: \${SERVICE_USER}"
        echo "[INFO] Creating release directory: \${NEW_RELEASE_DIR}"
        echo "[INFO] Release: \${TIMESTAMP}"

        # Verify service user exists
        if ! id "\${SERVICE_USER}" &>/dev/null; then
            echo "[ERROR] Service user '\${SERVICE_USER}' does not exist"
            exit 1
        fi

        # Create directory structure
        sudo mkdir -p \${NEW_RELEASE_DIR}

        # Set ownership of the directory structure immediately
        echo "[INFO] Setting ownership to service user: \${SERVICE_USER}"
        sudo chown -R \${SERVICE_USER}:\${SERVICE_USER} \${BASE_DIR}
        #sudo chown -R \${SERVICE_USER}:\${SERVICE_USER} \${NEW_RELEASE_DIR}

        # Extract source files to release directory
        echo "[INFO] Extracting source package..."
        cd \${NEW_RELEASE_DIR}
        sudo tar -xzf /tmp/source.tar.gz

        echo \$PWD
        
        # Set ownership of extracted files
        sudo chown -R \${SERVICE_USER}:\${SERVICE_USER} \${NEW_RELEASE_DIR}
        
        # Install dependencies and build on server
        echo "[INFO] Installing dependencies..."
        sudo bun i
        
        echo "[INFO] Building application..."
        sudo bun run build

        cd \${BASE_DIR}

        # Create current symlink if it doesn't exist
        if [ ! -L \${CURRENT_LINK} ] && [ ! -e \${CURRENT_LINK} ]; then
            echo "[INFO] Creating initial current symlink..."
            sudo ln -sfn \${NEW_RELEASE_DIR} \${CURRENT_LINK}
        fi

        # Atomic swap - update symlink to new release
        echo "[INFO] Swapping to new release..."
        sudo ln -sfn \${NEW_RELEASE_DIR} \${CURRENT_LINK}
        
        # Ensure the new symlink has correct ownership
        sudo chown -h \${SERVICE_USER}:\${SERVICE_USER} \${CURRENT_LINK}

        # Reload systemd service (graceful restart)
        echo "[INFO] Reloading service..."
        sudo systemctl reload-or-restart \${SERVICE_NAME}

        # Verify deployment
        echo "[INFO] Verifying deployment..."
        sleep 5
        if sudo systemctl is-active --quiet \${SERVICE_NAME}; then
            echo "[SUCCESS] Zero-downtime deployment successful"

            # Cleanup old releases (keep last 3)
            echo "[INFO] Cleaning up old releases..."
            cd \${BASE_DIR}/releases
            sudo ls -t | tail -n +4 | xargs -r sudo rm -rf
        else
            echo "[ERROR] Deployment failed - rolling back"
            # Rollback to previous release
            PREVIOUS_RELEASE=\$(sudo ls -t \${BASE_DIR}/releases | sed -n '2p')
            if [ -n "\$PREVIOUS_RELEASE" ]; then
                echo "[INFO] Rolling back to: \$PREVIOUS_RELEASE"
                sudo ln -sfn \${BASE_DIR}/releases/\${PREVIOUS_RELEASE} \${CURRENT_LINK}
                sudo chown -h \${SERVICE_USER}:\${SERVICE_USER} \${CURRENT_LINK}
                sudo systemctl reload-or-restart \${SERVICE_NAME}
            fi
            sudo systemctl status \${SERVICE_NAME}
            exit 1
        fi

        # Cleanup
        rm -f /tmp/source.tar.gz
EOF
}

# Cleanup local files
cleanup() {
    log_info "Cleaning up local files..."
    rm -f private_key.pem source.tar.gz
    log_info "Cleanup complete"
}

# Main deployment function
main() {
    log_info "Starting deployment process..."

	create_deployment_package

    check_env_vars
    check_deployment_package
    setup_ssh_key

    # Trap to ensure cleanup happens even if script fails
    trap cleanup EXIT

    copy_package
    deploy_on_server

    log_info "Deployment completed successfully!"
}

# Run main function
main
