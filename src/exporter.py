"""
Export functionality for the Lead Generator.
Exports leads to CSV and Excel formats.
"""

from datetime import datetime
from pathlib import Path
from typing import List, Optional

import pandas as pd

from .lead_extractor import Lead
from .config import get_config


class LeadExporter:
    """Exports leads to various file formats."""
    
    def __init__(self, output_dir: Optional[str] = None):
        """
        Initialize the exporter.
        
        Args:
            output_dir: Directory for output files. Defaults to 'data' folder.
        """
        if output_dir is None:
            output_dir = Path(__file__).parent.parent / "data"
        
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.config = get_config()
    
    def _leads_to_dataframe(self, leads: List[Lead]) -> pd.DataFrame:
        """
        Convert leads to a pandas DataFrame.
        
        Args:
            leads: List of Lead objects
            
        Returns:
            DataFrame with lead data
        """
        data = [lead.to_dict() for lead in leads]
        df = pd.DataFrame(data)
        
        # Reorder columns based on config
        export_columns = self.config.export_settings.get("columns", [])
        if export_columns:
            # Only include columns that exist in the data
            available_columns = [c for c in export_columns if c in df.columns]
            # Add any extra columns not in config
            extra_columns = [c for c in df.columns if c not in available_columns]
            df = df[available_columns + extra_columns]
        
        return df
    
    def _generate_filename(self, prefix: str, extension: str) -> str:
        """Generate a unique filename with timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{timestamp}.{extension}"
    
    def export_to_csv(
        self,
        leads: List[Lead],
        filename: Optional[str] = None,
        include_metadata: bool = True
    ) -> Path:
        """
        Export leads to a CSV file.
        
        Args:
            leads: List of leads to export
            filename: Output filename. Auto-generated if not provided.
            include_metadata: Include extraction metadata
            
        Returns:
            Path to the created file
        """
        if not filename:
            filename = self._generate_filename("leads", "csv")
        
        output_path = self.output_dir / filename
        
        df = self._leads_to_dataframe(leads)
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        
        return output_path
    
    def export_to_excel(
        self,
        leads: List[Lead],
        filename: Optional[str] = None,
        include_statistics: bool = True
    ) -> Path:
        """
        Export leads to an Excel file with formatting.
        
        Args:
            leads: List of leads to export
            filename: Output filename. Auto-generated if not provided.
            include_statistics: Include a statistics sheet
            
        Returns:
            Path to the created file
        """
        if not filename:
            filename = self._generate_filename("leads", "xlsx")
        
        output_path = self.output_dir / filename
        
        df = self._leads_to_dataframe(leads)
        
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            # Write main leads sheet
            df.to_excel(writer, sheet_name="Leads", index=False)
            
            # Auto-adjust column widths
            worksheet = writer.sheets["Leads"]
            for idx, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).apply(len).max(),
                    len(col)
                )
                # Limit column width to 50 characters
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
            
            if include_statistics:
                # Create statistics sheet
                from .lead_extractor import LeadExtractor
                extractor = LeadExtractor.__new__(LeadExtractor)
                extractor.config = self.config
                stats = extractor.get_statistics(leads)
                
                stats_data = {
                    "Metric": [
                        "Total Leads",
                        "With Website",
                        "Without Website",
                        "With Phone Number",
                        "Average Rating"
                    ],
                    "Value": [
                        stats["total"],
                        stats["with_website"],
                        stats["without_website"],
                        stats["with_phone"],
                        stats["average_rating"]
                    ]
                }
                
                # Add business type breakdown
                for btype, count in stats["by_type"].items():
                    stats_data["Metric"].append(f"Type: {btype}")
                    stats_data["Value"].append(count)
                
                stats_df = pd.DataFrame(stats_data)
                stats_df.to_excel(writer, sheet_name="Statistics", index=False)
                
                # Adjust statistics column widths
                stats_ws = writer.sheets["Statistics"]
                stats_ws.column_dimensions["A"].width = 25
                stats_ws.column_dimensions["B"].width = 15
        
        return output_path
    
    def export(
        self,
        leads: List[Lead],
        format: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Path:
        """
        Export leads to the specified format.
        
        Args:
            leads: List of leads to export
            format: Output format ('csv' or 'xlsx'). Uses config default if not specified.
            filename: Output filename. Auto-generated if not provided.
            
        Returns:
            Path to the created file
        """
        if format is None:
            format = self.config.export_settings.get("default_format", "csv")
        
        if format.lower() == "xlsx":
            return self.export_to_excel(leads, filename)
        else:
            return self.export_to_csv(leads, filename)
