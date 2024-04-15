#!/bin/bash

# This is used during the .deb installation process to install the shared library

# Set the path to the shared library (relative to the package root)
LIBRARY_NAME="libafv_native.so"

# Set the destination directory
DESTINATION_DIR="/usr/lib"

# Get the package name from the DEBIAN/control file
PACKAGE_NAME="trackaudio"

# Get the installation location of the package
LIBRARY_PATH=$(dpkg -L "$PACKAGE_NAME" | grep -o "/usr/.*/$LIBRARY_NAME")

# Copy the shared library to the destination directory
cp "$LIBRARY_PATH" "$DESTINATION_DIR"

# Set the appropriate permissions for the shared library
chmod 644 "$DESTINATION_DIR/$(basename $LIBRARY_PATH)"
chmod +x "$DESTINATION_DIR/$(basename $LIBRARY_PATH)"

# Run ldconfig to update the shared library cache
ldconfig

if [[ -f "$DESTINATION_DIR/$(basename $LIBRARY_PATH)" ]]; then
    echo "Shared library installed successfully to $DESTINATION_DIR"
else
    echo "Error: could not install $LIBRARY_NAME"
    return 1
fi


