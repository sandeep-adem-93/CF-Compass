import pandas as pd

# Load the Excel file
file_path = "cf-compass-backend/data/sources/Variant List_CFTR2_092524.xlsx"
xls = pd.ExcelFile(file_path)

# Display sheet names
xls.sheet_names
print(xls.sheet_names)  # Confirm actual sheet names

# Load both sheets
df_legacy = xls.parse('CFTR2 variants by legacy name')
df_genomic = xls.parse('CFTR2 variants, genomic info')

# Display first few rows of each sheet
print(df_legacy.head())
print(df_genomic.head())



# Extract relevant variant names from both sheets
variants_legacy = df_legacy['Variant cDNA name'].dropna().unique()  # Assuming variants start after metadata
variants_genomic = df_genomic['Variant cDNA name'].dropna().unique()

# Find unique variants in each sheet
unique_to_legacy = set(variants_legacy) - set(variants_genomic)
unique_to_genomic = set(variants_genomic) - set(variants_legacy)

# Create DataFrames for unique variants
df_unique_legacy = pd.DataFrame({'Unique in Legacy': list(unique_to_legacy)})
df_unique_genomic = pd.DataFrame({'Unique in Genomic': list(unique_to_genomic)})

print(df_unique_legacy)
print(df_unique_genomic)

# # Display the unique variants in each category
# import ace_tools as tools
# tools.display_dataframe_to_user(name="Unique Variants in Each Sheet", dataframe=df_unique_legacy)
# tools.display_dataframe_to_user(name="Unique Variants in Each Sheet", dataframe=df_unique_genomic)


# Remove unique variants from each sheet
df_filtered_legacy = df_legacy[~df_legacy['Variant cDNA name'].isin(unique_to_legacy)]
df_filtered_genomic = df_genomic[~df_genomic['Variant cDNA name'].isin(unique_to_genomic)]

# Save the cleaned sheets back to a new Excel file
filtered_file_path = "cf-compass-backend/data/sources/Filtered_Variant_List.xlsx"
with pd.ExcelWriter(filtered_file_path) as writer:
    df_filtered_legacy.to_excel(writer, sheet_name='CFTR2 variants by legacy name', index=False)
    df_filtered_genomic.to_excel(writer, sheet_name='CFTR2 variants, genomic info', index=False)

# Provide the cleaned file to the user
filtered_file_path
