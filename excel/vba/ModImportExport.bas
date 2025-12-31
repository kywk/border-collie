Attribute VB_Name = "ModImportExport"
Option Explicit

'=============================================================================
' BorderCollie Excel VBA - Import/Export Module
' 雙向匯入/匯出 BorderCollie 純文字格式
'=============================================================================

' === 匯出為 BorderCollie 純文字格式 ===
Public Sub ExportToText()
    Dim wsConfig As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim currentProject As String, lastProject As String
    Dim output As String
    Dim phase As Phase
    Dim j As Integer
    Dim assignmentStr As String
    Dim isPending As Boolean
    
    On Error GoTo ErrorHandler
    
    Set wsConfig = ThisWorkbook.Worksheets(SHEET_CONFIG)
    lastRow = wsConfig.Cells(wsConfig.Rows.Count, COL_PROJECT_NAME).End(xlUp).Row
    
    output = "name: BorderCollie Export" & vbCrLf
    output = output & "---" & vbCrLf
    
    lastProject = ""
    
    For i = 2 To lastRow
        ' 跳過空白列
        If Trim(wsConfig.Cells(i, COL_PROJECT_NAME).Value) = "" And _
           Trim(wsConfig.Cells(i, COL_PHASE_NAME).Value) = "" Then
            GoTo NextRow
        End If
        
        ' 取得專案名稱
        currentProject = Trim(wsConfig.Cells(i, COL_PROJECT_NAME).Value)
        If currentProject = "" Then currentProject = lastProject
        isPending = (UCase(Trim(wsConfig.Cells(i, COL_PENDING).Value)) = "Y")
        
        ' 新專案時輸出專案標題
        If currentProject <> lastProject Then
            If lastProject <> "" Then
                output = output & vbCrLf ' 專案間空一行
            End If
            
            If isPending Then
                output = output & currentProject & ", pending:" & vbCrLf
            Else
                output = output & currentProject & ":" & vbCrLf
            End If
            
            lastProject = currentProject
        End If
        
        ' 組合階段資料
        phase = ParsePhaseRowForExport(wsConfig, i)
        
        If phase.PhaseName <> "" Then
            ' 組合人員指派字串
            assignmentStr = ""
            For j = 0 To phase.AssignmentCount - 1
                If j > 0 Then assignmentStr = assignmentStr & ", "
                assignmentStr = assignmentStr & phase.Assignments(j).PersonName & " " & _
                               Format(phase.Assignments(j).Percentage, "0.0")
            Next j
            
            ' 輸出階段
            output = output & "- " & phase.PhaseName & ", " & _
                    FormatDateForExport(phase.StartDate) & ", " & _
                    FormatDateForExport(phase.EndDate)
            
            If assignmentStr <> "" Then
                output = output & ": " & assignmentStr
            End If
            
            output = output & vbCrLf
        End If
        
NextRow:
    Next i
    
    ' 顯示結果
    ShowTextDialog output, "匯出結果 - 請複製以下內容"
    
    Exit Sub
    
ErrorHandler:
    MsgBox "匯出錯誤: " & Err.Description, vbExclamation
End Sub

' === 從 BorderCollie 純文字格式匯入 ===
Public Sub ImportFromText()
    Dim inputText As String
    Dim lines() As String
    Dim i As Long
    Dim line As String
    Dim wsConfig As Worksheet
    Dim currentRow As Long
    Dim currentProject As String
    Dim isPending As Boolean
    
    On Error GoTo ErrorHandler
    
    ' 取得輸入文字
    inputText = GetTextFromDialog("匯入 BorderCollie 格式", "請貼上 BorderCollie 專案資料:")
    If inputText = "" Then Exit Sub
    
    Set wsConfig = ThisWorkbook.Worksheets(SHEET_CONFIG)
    
    ' 確認是否清除現有資料
    If wsConfig.Cells(2, COL_PROJECT_NAME).Value <> "" Then
        If MsgBox("是否清除現有資料後匯入?", vbYesNo + vbQuestion) = vbYes Then
            ClearConfigData
        Else
            Exit Sub
        End If
    End If
    
    ' 解析文字
    lines = Split(inputText, vbLf)
    currentRow = 2
    currentProject = ""
    isPending = False
    
    For i = 0 To UBound(lines)
        line = Trim(Replace(lines(i), vbCr, ""))
        
        ' 跳過空白行和 frontmatter
        If line = "" Or line = "---" Or Left(line, 5) = "name:" Or _
           Left(line, 12) = "description:" Then
            GoTo NextLine
        End If
        
        ' 專案宣告 (以冒號結尾)
        If Right(line, 1) = ":" And Left(line, 1) <> "-" Then
            currentProject = Left(line, Len(line) - 1)
            
            ' 檢查 pending 狀態
            If InStr(LCase(currentProject), ", pending") > 0 Then
                isPending = True
                currentProject = Trim(Left(currentProject, InStr(LCase(currentProject), ", pending") - 1))
            Else
                isPending = False
            End If
            
            GoTo NextLine
        End If
        
        ' 階段定義 (以 - 開頭)
        If Left(line, 1) = "-" And currentProject <> "" Then
            Call ParseAndInsertPhase(wsConfig, currentRow, currentProject, isPending, Mid(line, 2))
            currentRow = currentRow + 1
        End If
        
NextLine:
    Next i
    
    MsgBox "匯入完成！共匯入 " & (currentRow - 2) & " 個階段。", vbInformation
    
    ' 更新圖表
    Call UpdateAllCharts
    
    Exit Sub
    
ErrorHandler:
    MsgBox "匯入錯誤: " & Err.Description, vbExclamation
End Sub

' === 輔助函數 ===

' 解析單一列用於匯出
Private Function ParsePhaseRowForExport(ws As Worksheet, rowNum As Long) As Phase
    Dim phase As Phase
    Dim colOffset As Integer
    Dim personName As String
    Dim percentage As Double
    Dim tempAssignments() As Assignment
    Dim assignCount As Integer
    
    ReDim tempAssignments(0 To MAX_PERSONS_PER_PHASE - 1)
    assignCount = 0
    
    With phase
        .PhaseName = Trim(ws.Cells(rowNum, COL_PHASE_NAME).Value)
        .StartDate = ParseDateValue(ws.Cells(rowNum, COL_START_DATE).Value)
        .EndDate = ParseDateValue(ws.Cells(rowNum, COL_END_DATE).Value)
        
        ' 解析人員指派
        For colOffset = 0 To MAX_PERSONS_PER_PHASE - 1
            personName = Trim(ws.Cells(rowNum, COL_PERSON_START + colOffset * 2).Value)
            
            If personName <> "" Then
                percentage = Val(ws.Cells(rowNum, COL_PERSON_START + colOffset * 2 + 1).Value)
                If percentage > 0 Then
                    tempAssignments(assignCount).PersonName = personName
                    tempAssignments(assignCount).Percentage = percentage
                    assignCount = assignCount + 1
                End If
            End If
        Next colOffset
        
        If assignCount > 0 Then
            ReDim Preserve tempAssignments(0 To assignCount - 1)
            .Assignments = tempAssignments
        End If
        .AssignmentCount = assignCount
    End With
    
    ParsePhaseRowForExport = phase
End Function

' 格式化日期用於匯出
Private Function FormatDateForExport(d As Date) As String
    If d = 0 Then
        FormatDateForExport = "--"
    ElseIf Day(d) = 1 Then
        FormatDateForExport = Format(d, "yyyy-mm")
    Else
        FormatDateForExport = Format(d, "yyyy-mm-dd")
    End If
End Function

' 解析並插入階段資料
Private Sub ParseAndInsertPhase(ws As Worksheet, rowNum As Long, _
                                  projectName As String, isPending As Boolean, _
                                  phaseStr As String)
    Dim parts() As String
    Dim phaseName As String
    Dim startDate As String
    Dim endDate As String
    Dim assignmentsPart As String
    Dim assignments() As String
    Dim i As Integer
    Dim colonPos As Long
    Dim personParts() As String
    Dim colOffset As Integer
    
    ' 分割冒號前後
    colonPos = InStr(phaseStr, ":")
    If colonPos > 0 Then
        assignmentsPart = Trim(Mid(phaseStr, colonPos + 1))
        phaseStr = Trim(Left(phaseStr, colonPos - 1))
    Else
        assignmentsPart = ""
    End If
    
    ' 解析階段、日期
    parts = Split(phaseStr, ",")
    If UBound(parts) >= 0 Then phaseName = Trim(parts(0))
    If UBound(parts) >= 1 Then startDate = Trim(parts(1))
    If UBound(parts) >= 2 Then endDate = Trim(parts(2))
    
    ' 寫入基本資料
    ws.Cells(rowNum, COL_PROJECT_NAME).Value = projectName
    ws.Cells(rowNum, COL_PENDING).Value = IIf(isPending, "Y", "N")
    ws.Cells(rowNum, COL_PHASE_NAME).Value = phaseName
    
    ' 處理日期
    If startDate <> "--" And startDate <> "" Then
        ws.Cells(rowNum, COL_START_DATE).Value = ParseImportDate(startDate)
    End If
    If endDate <> "--" And endDate <> "" Then
        ws.Cells(rowNum, COL_END_DATE).Value = ParseImportDate(endDate)
    End If
    
    ' 解析人員指派
    If assignmentsPart <> "" Then
        assignments = Split(assignmentsPart, ",")
        colOffset = 0
        
        For i = 0 To UBound(assignments)
            If colOffset >= MAX_PERSONS_PER_PHASE Then Exit For
            
            personParts = Split(Trim(assignments(i)), " ")
            If UBound(personParts) >= 0 Then
                ws.Cells(rowNum, COL_PERSON_START + colOffset * 2).Value = Trim(personParts(0))
                
                If UBound(personParts) >= 1 Then
                    ws.Cells(rowNum, COL_PERSON_START + colOffset * 2 + 1).Value = Val(personParts(1))
                End If
                
                colOffset = colOffset + 1
            End If
        Next i
    End If
End Sub

' 解析匯入日期
Private Function ParseImportDate(dateStr As String) As Date
    On Error GoTo InvalidDate
    
    dateStr = Trim(dateStr)
    
    ' YYYY-MM 格式
    If Len(dateStr) = 7 And Mid(dateStr, 5, 1) = "-" Then
        ParseImportDate = DateSerial(CInt(Left(dateStr, 4)), CInt(Right(dateStr, 2)), 1)
        Exit Function
    End If
    
    ' YYYY-MM-DD 格式
    If Len(dateStr) = 10 Then
        ParseImportDate = DateSerial( _
            CInt(Left(dateStr, 4)), _
            CInt(Mid(dateStr, 6, 2)), _
            CInt(Right(dateStr, 2)))
        Exit Function
    End If
    
InvalidDate:
    ParseImportDate = 0
End Function

' 解析日期值 (複製以避免跨模組問題)
Private Function ParseDateValue(cellValue As Variant) As Date
    If IsDate(cellValue) Then
        ParseDateValue = CDate(cellValue)
    Else
        ParseDateValue = 0
    End If
End Function

' 清除 Config 資料
Private Sub ClearConfigData()
    Dim ws As Worksheet
    Dim lastRow As Long
    
    Set ws = ThisWorkbook.Worksheets(SHEET_CONFIG)
    lastRow = ws.Cells(ws.Rows.Count, COL_PROJECT_NAME).End(xlUp).Row
    
    If lastRow >= 2 Then
        ws.Range(ws.Cells(2, 1), ws.Cells(lastRow, COL_PERSON_START + MAX_PERSONS_PER_PHASE * 2)).ClearContents
    End If
End Sub

' 顯示文字對話框
Private Sub ShowTextDialog(text As String, title As String)
    Dim textBox As String
    
    ' 簡易方式：複製到剪貼簿
    Dim DataObj As Object
    Set DataObj = CreateObject("new:{1C3B4210-F441-11CE-B9EA-00AA006B1A69}")
    DataObj.SetText text
    DataObj.PutInClipboard
    
    MsgBox "已複製到剪貼簿！" & vbCrLf & vbCrLf & _
           "內容預覽：" & vbCrLf & Left(text, 500) & _
           IIf(Len(text) > 500, "...", ""), vbInformation, title
End Sub

' 取得文字輸入
Private Function GetTextFromDialog(title As String, prompt As String) As String
    GetTextFromDialog = InputBox(prompt, title, "", 100, 100)
End Function
