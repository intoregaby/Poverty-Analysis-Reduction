"""Aggregate-only, sourced Excel and PDF investigation reports."""

from __future__ import annotations

from html import escape
from pathlib import Path


def export_reports(folder: Path, manifest: dict, analysis: dict, sources: dict, prepared: dict) -> dict:
    folder.mkdir(parents=True, exist_ok=True)
    excel = folder / "investigation.xlsx"
    pdf = folder / "investigation.pdf"
    _excel(excel, manifest, analysis, sources, prepared)
    _pdf(pdf, manifest, analysis, sources, prepared)
    return {"excel": excel.name, "pdf": pdf.name}


def _excel(path: Path, manifest: dict, analysis: dict, sources: dict, prepared: dict) -> None:
    import xlsxwriter

    book = xlsxwriter.Workbook(path)
    title = book.add_format({"bold": True, "font_size": 18, "font_color": "#0A2540"})
    head = book.add_format({"bold": True, "bg_color": "#F1F4F9", "font_color": "#425466", "border": 0})
    note = book.add_format({"text_wrap": True, "valign": "top", "font_color": "#425466"})
    percent = book.add_format({"num_format": '0.0"%"'})
    for name in ["Investigation Summary", "Verified Findings", "Data Tables", "Editable Charts", "District Comparisons", "Drivers", "Who Is Poor", "Research Requests", "Action Plan", "Sources and Methodology", "Limitations"]:
        sheet = book.add_worksheet(name)
        sheet.set_tab_color("#635BFF")
        sheet.set_column(0, 0, 28)
        sheet.set_column(1, 1, 24)
        sheet.set_column(2, 2, 26)
        sheet.set_column(3, 6, 48)

    summary = book.get_worksheet_by_name("Investigation Summary")
    summary.write_string(0, 0, f"{analysis['district']} District Investigation", title)
    rows = [
        ("Investigation ID", manifest["id"]), ("Survey", analysis["survey"]),
        ("Status", manifest["status"]), ("Action status", prepared["plan"]["approval_status"]),
        ("Evaluation", prepared["evaluation"]["status"]),
        ("Data signature", manifest["data_signature"]),
    ]
    for index, (label, value) in enumerate(rows, start=2):
        summary.write_string(index, 0, label, head)
        summary.write_string(index, 1, str(value), note)
    summary.set_column(1, 1, 75)
    brief = prepared.get("analyst_brief")
    if brief:
        summary.write_string(10, 0, "Analyst conclusion", head)
        summary.write_string(10, 1, brief["headline"], note)
        summary.set_row(10, 45)
        for row_number, item in enumerate(brief["observations"], start=12):
            summary.write_string(row_number, 0, item["title"], head)
            summary.write_string(row_number, 1, f"{item['text']} {item['meaning']} Investigate next: {item['next_step']}", note)
            summary.set_row(row_number, 100)
        end = 13 + len(brief["observations"])
        for offset, key in enumerate(["coverage", "interpretation", "decision", "support_question"]):
            summary.write_string(end + offset, 0, key.replace("_", " ").title(), head)
            summary.write_string(end + offset, 1, brief[key], note)
            summary.set_row(end + offset, 65)

    findings = book.get_worksheet_by_name("Verified Findings")
    for column, label in enumerate(["Finding", "District %", "Rwanda %", "Population", "Survey period", "Source", "Limitations", "95% CI lower", "95% CI upper"]):
        findings.write_string(0, column, label, head)
    for row_number, item in enumerate(prepared["findings"]["findings"], start=1):
        findings.write_string(row_number, 0, item["title"])
        findings.write_number(row_number, 1, item["value"], percent)
        findings.write_number(row_number, 2, item["national"], percent)
        findings.write_string(row_number, 3, item["unit"])
        findings.write_string(row_number, 4, item["period"])
        findings.write_string(row_number, 5, item["source"])
        findings.write_string(row_number, 6, item["limitations"], note)
        if item.get("confidence_interval"):
            findings.write_number(row_number, 7, item["confidence_interval"]["lower"], percent)
            findings.write_number(row_number, 8, item["confidence_interval"]["upper"], percent)
        findings.set_row(row_number, 52)

    data = book.get_worksheet_by_name("Data Tables")
    for column, label in enumerate(["District", "Poverty % of people", "VUP % of poor HH", "Grid % of HH", "Insurance % of people", "Survey HH", "Poor HH"]):
        data.write_string(0, column, label, head)
    selected = analysis["selected"]["district"]
    table_rows = [analysis["selected"], *analysis["comparators"]]
    for row_number, row in enumerate(table_rows, start=1):
        data.write_string(row_number, 0, row["district"])
        for column, key in enumerate(["poverty", "vup_among_poor", "grid_connection", "health_insurance"], start=1):
            data.write_number(row_number, column, row[key], percent)
        data.write_number(row_number, 5, row["sample_households"])
        data.write_number(row_number, 6, row["sample_poor_households"])
    national_row = len(table_rows) + 1
    data.write_string(national_row, 0, "Rwanda")
    for column, key in enumerate(["poverty", "vup_among_poor", "grid_connection", "health_insurance"], start=1):
        data.write_number(national_row, column, analysis["national"][key], percent)
    data.freeze_panes(1, 1)

    charts = book.get_worksheet_by_name("Editable Charts")
    charts.write_string(0, 0, "Poverty among people · EICV7 2023/24", title)
    chart = book.add_chart({"type": "bar"})
    chart.add_series({
        "name": "Poverty rate (%)",
        "categories": ["Data Tables", 1, 0, national_row, 0],
        "values": ["Data Tables", 1, 1, national_row, 1],
        "fill": {"color": "#635BFF"},
        "data_labels": {"value": True, "num_format": '0.0"%"'},
    })
    chart.set_x_axis({"name": "Percent of people", "min": 0, "max": 60})
    chart.set_legend({"none": True})
    chart.set_size({"width": 690, "height": 320})
    charts.insert_chart("A3", chart)
    charts.write_string(22, 0, "Edit the Data Tables cells to update this chart. Values are source estimates, not planning assumptions.", note)
    charts.set_column(0, 0, 92)

    compare = book.get_worksheet_by_name("District Comparisons")
    compare.write_string(0, 0, f"{selected} and same-province comparators", title)
    compare.write_string(2, 0, analysis["method"]["comparators"], note)
    for column, label in enumerate(["District", "Poverty %", "Grid %", "VUP %", "Survey HH"]):
        compare.write_string(4, column, label, head)
    for index, row in enumerate(table_rows, start=5):
        compare.write_string(index, 0, row["district"])
        compare.write_number(index, 1, row["poverty"], percent)
        compare.write_number(index, 2, row["grid_connection"], percent)
        compare.write_number(index, 3, row["vup_among_poor"], percent)
        compare.write_number(index, 4, row["sample_households"])
    context = prepared.get("contextual_analysis")
    if context:
        context_row = len(table_rows) + 8
        for column, label in enumerate(["Area", "Rural people %", "Average household size", "Survey HH"]):
            compare.write_string(context_row, column, label, head)
        for index, row in enumerate(context["profiles"], start=context_row + 1):
            compare.write_string(index, 0, row["district"])
            compare.write_number(index, 1, row["rural_population_pct"], percent)
            compare.write_number(index, 2, row["mean_household_size"])
            compare.write_number(index, 3, row["sample_households"])
        compare.write_string(context_row + len(context["profiles"]) + 3, 0, context["method"], note)
        compare.write_string(context_row + len(context["profiles"]) + 5, 0, context["limitations"], note)

    plan = book.get_worksheet_by_name("Action Plan")
    for index, (key, value) in enumerate(prepared["plan"].items()):
        plan.write_string(index, 0, key.replace("_", " ").title(), head)
        plan.write_string(index, 1, "; ".join(map(str, value)) if isinstance(value, list) else str(value or "Not proposed"), note)
        plan.set_row(index, 34)
    plan.set_column(1, 1, 90)

    source_sheet = book.get_worksheet_by_name("Sources and Methodology")
    for column, label in enumerate(["Publisher", "Document", "Data period", "URL", "Latest check", "Version SHA256", "Limitations", "Check timestamp", "Publication date", "Coverage", "Methodology", "Error", "Cached copy verified at"]):
        source_sheet.write_string(0, column, label, head)
    for index, item in enumerate(sources["sources"], start=1):
        cached = item.get("cached_evidence", {})
        for column, value in enumerate([item["publisher"], item["title"], item["data_period"], item["url"], item["status"], item.get("version") or cached.get("version") or "Unavailable", item["limitations"], item.get("retrieved_at", ""), item.get("publication_date") or "Not verified", item.get("geographic_coverage", ""), item.get("methodology", ""), item.get("error") or "None", cached.get("retrieved_at", "No fallback used")]):
            source_sheet.write_string(index, column, str(value), note)
        source_sheet.set_row(index, 60)
    method_row = len(sources["sources"]) + 3
    for key, value in analysis["method"].items():
        source_sheet.write_string(method_row, 0, key.replace("_", " ").title(), head)
        source_sheet.write_string(method_row, 1, value, note)
        method_row += 1
    source_sheet.set_column(3, 3, 85)

    drivers = prepared.get("drivers")
    diagnosis = prepared.get("diagnosis")
    if drivers and diagnosis:
        sheet = book.get_worksheet_by_name("Drivers")
        sheet.write_string(0, 0, f"{drivers['district']}: what lines up with the gap to Rwanda", title)
        sheet.write_string(1, 0, f"{diagnosis['headline']} {diagnosis['reading']} {diagnosis['causal_status']}", note)
        sheet.set_row(1, 60)
        sheet.set_column(0, 0, 44)
        sheet.set_column(1, 6, 20)
        for column, label in enumerate(["Factor group", "Role", "Points of gap", "Interval low", "Interval high", "Sign stability", "Evidence grade"]):
            sheet.write_string(3, column, label, head)
        for row_number, group in enumerate(sorted(drivers["groups"], key=lambda item: -abs(item["contribution_points"])), start=4):
            sheet.write_string(row_number, 0, group["label"], note)
            sheet.write_string(row_number, 1, group["role"], note)
            sheet.write_number(row_number, 2, group["contribution_points"])
            sheet.write_number(row_number, 3, group["ci_lower"])
            sheet.write_number(row_number, 4, group["ci_upper"])
            sheet.write_number(row_number, 5, group["sign_stability"])
            sheet.write_string(row_number, 6, group["grade"], note)
        end = 5 + len(drivers["groups"])
        for offset, (label, value) in enumerate([("Gap to Rwanda (points)", drivers["gap_points"]), ("Explained by measured factors", drivers["explained_points"]), ("Unexplained", drivers["unexplained_points"])]):
            sheet.write_string(end + offset, 0, label, head)
            sheet.write_number(end + offset, 2, value)
        for offset, (label, key, height) in enumerate([("Method", "method", 110), ("Interpretation", "interpretation", 70), ("Limitations", "limitations", 90)]):
            sheet.write_string(end + 4 + offset, 0, label, head)
            sheet.merge_range(end + 4 + offset, 1, end + 4 + offset, 6, drivers[key], note)
            sheet.set_row(end + 4 + offset, height)
        who = book.get_worksheet_by_name("Who Is Poor")
        who.write_string(0, 0, f"Who is poor in {drivers['district']}", title)
        who.set_column(0, 0, 50)
        who.set_column(1, 8, 18)
        for column, label in enumerate(["Household condition", "Sample with", "District share %", "Rwanda share %", "Poverty with %", "Poverty without %", "Risk ratio", "Share of district poor %", "Poor people (est.)"]):
            who.write_string(2, column, label, head)
        for row_number, row in enumerate(drivers["profile"], start=3):
            who.write_string(row_number, 0, row["label"], note)
            who.write_number(row_number, 1, row["sample_with"])
            who.write_number(row_number, 2, row["district_prevalence_pct"])
            who.write_number(row_number, 3, row["national_prevalence_pct"])
            if row["status"] == "Estimated":
                for column, key in enumerate(["poverty_with_pct", "poverty_without_pct", "risk_ratio", "share_of_district_poor_pct", "poor_people_with"], start=4):
                    if row.get(key) is not None:
                        who.write_number(row_number, column, row[key])
            else:
                who.write_string(row_number, 4, row["status"], note)
        requests_sheet = book.get_worksheet_by_name("Research Requests")
        requests_sheet.write_string(0, 0, "Open research requests", title)
        requests_sheet.set_column(0, 0, 8)
        requests_sheet.set_column(1, 1, 28)
        requests_sheet.set_column(2, 3, 70)
        requests_sheet.set_column(4, 5, 30)
        for column, label in enumerate(["ID", "Topic", "Question", "Why", "Kind", "Owner"]):
            requests_sheet.write_string(2, column, label, head)
        for row_number, item in enumerate(diagnosis["research_requests"], start=3):
            for column, key in enumerate(["id", "topic", "question", "why", "kind", "owner"]):
                requests_sheet.write_string(row_number, column, item[key], note)

    limitations = book.get_worksheet_by_name("Limitations")
    items = [analysis["method"]["uncertainty"], *analysis["not_analyzed"], prepared["research"]["conclusion"], prepared["evaluation"]["note"]]
    items.extend(conflict["explanation"] for conflict in prepared["source_conflicts"])
    for index, value in enumerate(items):
        limitations.write_string(index, 0, f"{index + 1}. {value}", note)
        limitations.set_row(index, 55)
    limitations.set_column(0, 0, 115)
    book.close()


def _pdf(path: Path, manifest: dict, analysis: dict, sources: dict, prepared: dict) -> None:
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.barcharts import HorizontalBarChart

    style = getSampleStyleSheet()
    style["Title"].textColor = colors.HexColor("#0A2540")
    style["Heading2"].textColor = colors.HexColor("#0A2540")
    document = SimpleDocTemplate(str(path), pagesize=(210 * mm, 297 * mm), leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=17 * mm)
    story = [Paragraph(f"{escape(analysis['district'])} District Investigation", style["Title"]),
             Paragraph("NISR Track 2 · EICV7 evidence report", style["Normal"]), Spacer(1, 8 * mm)]
    story.append(Paragraph(f"Investigation {escape(manifest['id'])} · {escape(manifest['started_at'][:10])}", style["Normal"]))
    brief = prepared.get("analyst_brief")
    if brief:
        story.append(Paragraph("Analyst conclusion", style["Heading2"]))
        story.append(Paragraph(escape(brief["headline"]), style["BodyText"]))
        for item in brief["observations"]:
            story.append(Paragraph(escape(item["title"]), style["Heading3"]))
            story.append(Paragraph(escape(item["text"]), style["BodyText"]))
            story.append(Paragraph(escape(item["meaning"]), style["BodyText"]))
            story.append(Paragraph(f"Investigate next: {escape(item['next_step'])}", style["BodyText"]))
        story.append(Paragraph("Analyst decision", style["Heading3"]))
        story.append(Paragraph(escape(brief["decision"]), style["BodyText"]))
        story.append(Paragraph(escape(brief["coverage"]), style["BodyText"]))
        story.append(PageBreak())
    drivers, diagnosis = prepared.get("drivers"), prepared.get("diagnosis")
    if drivers and diagnosis:
        story.append(Paragraph("What lines up with the gap to Rwanda", style["Heading2"]))
        story.append(Paragraph(escape(f"{diagnosis['headline']} {diagnosis['reading']}"), style["BodyText"]))
        story.append(Paragraph(escape(diagnosis["causal_status"]), style["Normal"]))
        driver_rows = [["Driver", "Points of gap", "95% interval", "Evidence"]]
        for item in diagnosis["ranked_drivers"]:
            driver_rows.append([Paragraph(escape(item["label"]), style["Normal"]), f"{item['contribution_points']:+.1f}", f"{item['ci'][0]:.1f} to {item['ci'][1]:.1f}", Paragraph(escape(item["grade"]), style["Normal"])])
        if len(driver_rows) > 1:
            driver_table = Table(driver_rows, colWidths=[75 * mm, 28 * mm, 33 * mm, 37 * mm], repeatRows=1)
            driver_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F4F9")), ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
            story.append(driver_table)
        for item in diagnosis["ranked_drivers"]:
            story.append(Paragraph(escape(item["label"]), style["Heading3"]))
            story.append(Paragraph(escape(item["finding"]), style["BodyText"]))
            story.append(Paragraph(f"Hypothesis to test: {escape(item['mechanism_hypothesis'])}", style["Normal"]))
        depth = drivers["depth"]
        story.append(Paragraph("How deep is poverty?", style["Heading3"]))
        story.append(Paragraph(escape(f"{depth['district']['poor_people']:,} people are estimated poor ({depth['district']['headcount_pct']}%). Poverty gap {depth['district']['poverty_gap_pct']}% against {depth['national']['poverty_gap_pct']}% nationally; severity {depth['district']['severity_pct']}% against {depth['national']['severity_pct']}%. {depth['note']}"), style["BodyText"]))
        story.append(Paragraph("Open research requests", style["Heading3"]))
        for item in diagnosis["research_requests"]:
            story.append(Paragraph(escape(f"{item['id']} · {item['topic']}: {item['question']}"), style["BodyText"]))
        story.append(Paragraph(escape(drivers["limitations"]), style["Normal"]))
        story.append(PageBreak())
    story.append(Paragraph("What did we find?", style["Heading2"]))
    for finding in prepared["findings"]["findings"]:
        story.append(Paragraph(escape(finding["title"]), style["Heading3"]))
        story.append(Paragraph(escape(finding["explanation"]), style["BodyText"]))
        story.append(Paragraph(f"Sample: {finding['sample']} · {escape(finding['unit'])} · {escape(finding['period'])}. {escape(finding['limitations'])}", style["Normal"]))
        if finding.get("confidence_interval"):
            interval = finding["confidence_interval"]
            story.append(Paragraph(f"NISR published 95% confidence interval: {interval['lower']:.2f}% to {interval['upper']:.2f}% (Main Indicators, Table A9.23).", style["Normal"]))
        story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("District comparison", style["Heading2"]))
    chart_rows = [analysis["selected"], *analysis["comparators"], {**analysis["national"], "district": "Rwanda"}]
    drawing = Drawing(480, 160)
    chart = HorizontalBarChart()
    chart.x, chart.y, chart.width, chart.height = 85, 25, 360, 125
    chart.data = [[row["poverty"] for row in chart_rows]]
    chart.categoryAxis.categoryNames = [row["district"] for row in chart_rows]
    chart.categoryAxis.labels.fontSize = 9
    chart.valueAxis.valueMin, chart.valueAxis.valueMax, chart.valueAxis.valueStep = 0, 60, 10
    chart.bars[0].fillColor = colors.HexColor("#635BFF")
    chart.barLabelFormat = "%.1f%%"
    drawing.add(chart)
    story.extend([Paragraph("Poverty, percent of people · EICV7 2023/24", style["Normal"]), drawing])
    rows = [["District", "Poverty · people", "Grid · households", "VUP · poor HH"]]
    for row in [analysis["selected"], *analysis["comparators"]]:
        rows.append([row["district"], f"{row['poverty']:.1f}%", f"{row['grid_connection']:.1f}%", f"{row['vup_among_poor']:.1f}%"])
    rows.append(["Rwanda", f"{analysis['national']['poverty']:.1f}%", f"{analysis['national']['grid_connection']:.1f}%", f"{analysis['national']['vup_among_poor']:.1f}%"])
    table = Table(rows, colWidths=[37 * mm, 44 * mm, 48 * mm, 44 * mm], repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F4F9")),
                               ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#425466")),
                               ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFBFD")]),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 7)]))
    story.extend([table, Spacer(1, 4 * mm), Paragraph(escape(analysis["method"]["comparators"]), style["Normal"])])
    context = prepared.get("contextual_analysis")
    if context:
        story.append(Paragraph("District context", style["Heading2"]))
        context_rows = [["Area", "Rural people", "Mean household size"]]
        for row in context["profiles"]:
            context_rows.append([row["district"], f"{row['rural_population_pct']:.1f}%", f"{row['mean_household_size']:.2f}"])
        context_table = Table(context_rows, colWidths=[55 * mm, 55 * mm, 63 * mm], repeatRows=1)
        context_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F4F9")), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
        story.append(context_table)
        for comparison in context["comparisons"]:
            story.append(Paragraph(f"Versus {escape(comparison['district'])}: poverty gap {comparison['gap_points']:.2f} points; approximate individual 95% interval {comparison['ci_lower']:.2f} to {comparison['ci_upper']:.2f}. {escape(comparison['conclusion'])}.", style["BodyText"]))
        story.append(Paragraph(escape(context["method"]), style["BodyText"]))
        story.append(Paragraph(escape(context["limitations"]), style["BodyText"]))
    story.append(Paragraph("Possible next steps", style["Heading2"]))
    for option in prepared["research"]["options"]:
        story.append(Paragraph(f"{escape(option['title'])}: {escape(option['status'])}. {escape(option['risk'])}", style["BodyText"]))
    story.append(Paragraph("Action and evaluation", style["Heading2"]))
    story.append(Paragraph(escape(prepared["plan"]["approval_status"]), style["BodyText"]))
    story.append(Paragraph(escape(prepared["evaluation"]["note"]), style["BodyText"]))
    story.append(Paragraph("Sources and limitations", style["Heading2"]))
    for item in sources["sources"]:
        story.append(Paragraph(f"{escape(item['title'])} — {escape(item['status'])}; period {escape(item['data_period'])}. {escape(item['url'])}", style["Normal"]))
        if item.get("cached_evidence"):
            story.append(Paragraph(f"Latest update check failed. Using a previously verified copy retrieved {escape(item['cached_evidence']['retrieved_at'])}; its content hash was checked again.", style["Normal"]))
        if item.get("error"):
            story.append(Paragraph(escape(item["error"]), style["Normal"]))
    story.append(Paragraph(escape(analysis["method"]["uncertainty"]), style["BodyText"]))
    for conflict in prepared["source_conflicts"]:
        story.append(Paragraph(f"Source conflict: {escape(conflict['district'])} narrative {conflict['published_narrative']:.1f}% versus calculated {conflict['calculated_eicv7']:.1f}%. {escape(conflict['explanation'])}", style["BodyText"]))
    if prepared.get("data_quality"):
        story.append(Paragraph("Processing notes and their impact", style["Heading2"]))
        quality = prepared["data_quality"]
        if quality.get("discovery_note"):
            story.append(Paragraph(escape(quality["discovery_note"]), style["BodyText"]))
        if quality.get("reader_notes"):
            story.append(Paragraph("Some Stata text labels required alternate decoding. Geography, responses and the numerical estimates passed validation. This recovered format issue does not make the overall district estimate incomplete.", style["BodyText"]))
        for entry in quality.get("unreadable_entries", []):
            story.append(Paragraph(f"Unreadable source entry ({escape(entry.get('survey') or 'unidentified survey')}): {escape(entry['filename'])}. {escape(entry['error'])}", style["Normal"]))
    document.build(story)
