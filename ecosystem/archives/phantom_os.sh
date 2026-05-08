#!/data/data/com.termux/files/usr/bin/bash

# --- PHANTOM_OS EVIDENCE ARCHIVER ---
# Moves all .csv logs and .wav EVP files into a dated folder in ~/storage/downloads

# --- CONFIGURATION ---
# Define the evidence folder name with the current date and time
EVIDENCE_FOLDER="phantom_hunt_$(date +%Y-%m-%d_%H%M)"
# Define the destination path in the public Downloads folder
DESTINATION_PATH="$HOME/storage/downloads/$EVIDENCE_FOLDER"

echo -e "\e[1;34mPHANTOM_OS: Initializing Evidence Archiver...\e[0m"

# 1. Create the destination directory
echo -n "Creating evidence folder: "
mkdir -pv "$DESTINATION_PATH"

# 2. Move all CSV log files
echo -n "Archiving log files (*.csv)... "
mv -v $HOME/*.csv "$DESTINATION_PATH/" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "\e[1;32mDone.\e[0m"
else
    echo -e "\e[1;33mNo CSV files found.\e[0m"
fi

# 3. Move all WAV audio files (EVP captures)
echo -n "Archiving EVP files (*.wav)... "
mv -v $HOME/*.wav "$DESTINATION_PATH/" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "\e[1;32mDone.\e[0m"
else
    echo -e "\e[1;33mNo WAV files found.\e[0m"
fi

# 4. Generate a simple README for the folder
README_FILE="$DESTINATION_PATH/README_HUNT.txt"
{
    echo "PHANTOM_OS Evidence Folder"
    echo "Generated on: $(date)"
    echo "------------------------"
    echo "This folder contains data from a paranormal investigation."
    echo ""
    echo "- CSV Files: Contain timestamped sensor data (EMF, Motion, Pressure, GPS)."
    echo "- WAV Files: Are EVP (Electronic Voice Phenomenon) audio clips,"
    echo "            automatically triggered by EMF spikes."
    echo ""
    echo "Analysis Tips:"
    echo "  * Open CSV files in a spreadsheet program for graphing and analysis."
    echo "  * Correlate timestamps in audio files with EMF spikes in the data log."
    echo "  * The baseline EMF was set to 53uT at the start of the hunt."
} > "$README_FILE"

echo -e "\e[1;32m------------------------"
echo -e "ARCHIVING COMPLETE!"
echo -e "------------------------\e[0m"
echo -e "All evidence has been moved to:"
echo -e "\e[1;33m$DESTINATION_PATH\e[0m"
echo ""
echo -e "A README file has been created for reference."
