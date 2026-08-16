import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

class PDFReportService:
    @staticmethod
    def generate_criterion1_report(analyses: list, gaps: list, recommendations: list, institution_name: str = "Higher Education Institution") -> bytes:
        """
        Generates a downloadable PDF report for NAAC Criterion 1 readiness.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=15
        )

        h2_style = ParagraphStyle(
            'H2Style',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=15,
            spaceAfter=8
        )

        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor('#334155')
        )

        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            textColor=colors.white
        )

        elements = []

        # Header Title
        elements.append(Paragraph("NAAC Criterion 1 Accreditation Readiness Report", title_style))
        elements.append(Paragraph(f"CampusInsight AI Analysis | Institution: {institution_name} | Generated: {datetime.now().strftime('%B %d, %Y')}", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=15))

        # Overall Summary Section
        avg_score = sum([a.score for a in analyses]) / len(analyses) if analyses else 0.0
        overall_cgpa = round(avg_score * 4.0 / 100, 2)
        
        readiness_status = "Excellent (A++ Ready)" if overall_cgpa >= 3.51 else ("Good (A / A+ Ready)" if overall_cgpa >= 3.0 else "Needs Targeted Documentation")

        elements.append(Paragraph("Executive Summary & Overall Criterion 1 Grade", h2_style))
        
        summary_text = (
            f"<b>Criterion 1 (Curricular Aspects) Overall Quality Score:</b> {avg_score:.1f} / 100 "
            f"(Estimated CGPA Equivalent: <b>{overall_cgpa} / 4.00</b>)<br/>"
            f"<b>Assessed Status:</b> {readiness_status}<br/>"
            f"This automated evaluation covers Sub-Criteria 1.1 (Curriculum Design & Development), "
            f"1.2 (Academic Flexibility), 1.3 (Curriculum Enrichment), and 1.4 (Feedback System)."
        )
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 12))

        # Sub-Criteria Score Table
        elements.append(Paragraph("1. Sub-Criteria Performance Breakdown", h2_style))
        
        table_data = [
            [
                Paragraph("Sub-Criterion", table_header_style),
                Paragraph("Title", table_header_style),
                Paragraph("Score (%)", table_header_style),
                Paragraph("CGPA", table_header_style),
                Paragraph("Readiness Level", table_header_style)
            ]
        ]

        for a in analyses:
            table_data.append([
                Paragraph(a.sub_criterion, body_style),
                Paragraph(a.title, body_style),
                Paragraph(f"{a.score:.1f}%", body_style),
                Paragraph(f"{a.cgpa_equivalent:.2f}", body_style),
                Paragraph(a.readiness_level, body_style)
            ])

        t = Table(table_data, colWidths=[70, 220, 65, 55, 130])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 15))

        # Identified Quality Gaps Table
        elements.append(Paragraph("2. Identified Documentation Gaps & Missing Evidence", h2_style))
        if gaps:
            gap_data = [
                [
                    Paragraph("Sub-Crit", table_header_style),
                    Paragraph("Gap Title", table_header_style),
                    Paragraph("Severity", table_header_style),
                    Paragraph("Description & Recommended Action", table_header_style)
                ]
            ]
            for g in gaps:
                gap_data.append([
                    Paragraph(g.sub_criterion, body_style),
                    Paragraph(g.title, body_style),
                    Paragraph(f"<b>{g.severity}</b>", body_style),
                    Paragraph(f"<b>Missing:</b> {g.missing_evidence or 'N/A'}<br/><b>Action:</b> {g.recommended_action or 'N/A'}", body_style)
                ])

            gt = Table(gap_data, colWidths=[55, 140, 65, 280])
            gt.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DC2626')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FECACA')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FEF2F2')]),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(gt)
        else:
            elements.append(Paragraph("No critical documentation gaps identified.", body_style))

        elements.append(Spacer(1, 15))

        # AI Recommendations & SHAP Rationale
        elements.append(Paragraph("3. Agentic AI Recommendations & SHAP Explanation", h2_style))
        for r in recommendations[:5]:
            rec_text = f"<b>[{r.sub_criterion}] {r.title} (Priority: {r.priority})</b><br/>{r.recommendation_text}"
            elements.append(Paragraph(rec_text, body_style))
            elements.append(Spacer(1, 6))

        # Footer
        elements.append(Spacer(1, 20))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=8))
        elements.append(Paragraph("Generated automatically by CampusInsight AI - Intelligent NAAC Criterion 1 Assessment System", subtitle_style))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @staticmethod
    def generate_criterion1_csv(analyses: list, gaps: list, recommendations: list, institution_name: str = "Higher Education Institution") -> str:
        """
        Generates a CSV formatted string for NAAC Criterion 1 readiness & evidence data.
        """
        import csv
        output = io.StringIO()
        writer = csv.writer(output)

        # Title
        writer.writerow(["NAAC Criterion 1 Accreditation Readiness Report"])
        writer.writerow(["Institution", institution_name])
        writer.writerow(["Generated Date", datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])

        # Sub-criteria breakdown
        writer.writerow(["--- 1. SUB-CRITERIA PERFORMANCE BREAKDOWN ---"])
        writer.writerow(["Sub-Criterion", "Title", "Score (%)", "CGPA Equivalent", "Readiness Level", "Evidence Count", "Gap Count"])
        for a in analyses:
            writer.writerow([a.sub_criterion, a.title, f"{a.score:.1f}", f"{a.cgpa_equivalent:.2f}", a.readiness_level, a.evidence_count, a.gap_count])
        writer.writerow([])

        # Gaps
        writer.writerow(["--- 2. IDENTIFIED DOCUMENTATION GAPS & MISSING EVIDENCE ---"])
        writer.writerow(["Sub-Criterion", "Title", "Severity", "Status", "Description", "Missing Evidence", "Recommended Action"])
        for g in gaps:
            writer.writerow([g.sub_criterion, g.title, g.severity, g.status, g.description, g.missing_evidence or "N/A", g.recommended_action or "N/A"])
        writer.writerow([])

        # Recommendations
        writer.writerow(["--- 3. AGENTIC AI ACTION RECOMMENDATIONS ---"])
        writer.writerow(["Sub-Criterion", "Title", "Priority", "Recommendation Text", "Action Items"])
        for r in recommendations:
            actions_str = " | ".join(r.action_items) if r.action_items else "N/A"
            writer.writerow([r.sub_criterion, r.title, r.priority, r.recommendation_text, actions_str])

        return output.getvalue()

