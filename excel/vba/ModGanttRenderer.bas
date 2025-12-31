Attribute VB_Name = "ModGanttRenderer"
Option Explicit

'=============================================================================
' BorderCollie Excel VBA - Gantt Chart Renderer Module
' 繪製專案甘特圖與人力甘特圖
'=============================================================================

' === 主要繪製函數 ===

Public Sub RenderProjectGantt()
    Dim ws As Worksheet
    Dim phases As Collection
    Dim timeRange As Variant
    Dim projects As Collection
    Dim startDate As Date, endDate As Date
    Dim monthCount As Integer
    Dim currentRow As Long
    Dim projectName As String
    Dim phase As Variant
    Dim i As Long, j As Long
    Dim projectIndex As Integer
    
    On Error GoTo ErrorHandler
    
    Application.ScreenUpdating = False
    
    ' 取得或建立工作表
    Set ws = GetOrCreateSheet(SHEET_PROJECT_GANTT)
    ws.Cells.Clear
    
    ' 解析資料
    Set phases = ParseConfigData()
    If phases.Count = 0 Then
        ws.Cells(1, 1).Value = "無資料。請在 Config 工作表輸入專案資料。"
        GoTo Cleanup
    End If
    
    ' 取得時間範圍
    timeRange = GetTimeRange(phases)
    startDate = timeRange(0)
    endDate = timeRange(1)
    monthCount = DateDiff("m", startDate, endDate) + 1
    
    ' 繪製標題列
    Call DrawTimelineHeader(ws, startDate, monthCount)
    
    ' 取得專案清單
    Set projects = GetProjectList(phases)
    
    ' 繪製每個專案
    currentRow = GANTT_HEADER_ROWS + 1
    projectIndex = 0
    
    For i = 1 To projects.Count
        projectName = projects(i)
        
        ' 繪製專案名稱
        ws.Cells(currentRow, 1).Value = projectName
        ws.Cells(currentRow, 1).Font.Bold = True
        ws.Cells(currentRow, 1).Font.Size = 11
        
        ' 繪製該專案的所有階段
        For j = 1 To phases.Count
            phase = phases(j)
            If phase.ProjectName = projectName And Not phase.IsPending Then
                currentRow = currentRow + 1
                
                ' 階段名稱
                ws.Cells(currentRow, 1).Value = "  " & phase.PhaseName
                ws.Cells(currentRow, 1).Font.Color = RGB(100, 100, 100)
                
                ' 繪製條塊
                Call DrawPhaseBar(ws, currentRow, phase, startDate, projectIndex)
            End If
        Next j
        
        projectIndex = projectIndex + 1
        currentRow = currentRow + 2 ' 專案間空一列
    Next i
    
    ' 調整欄寬
    ws.Columns(1).ColumnWidth = 25
    
Cleanup:
    Application.ScreenUpdating = True
    Exit Sub
    
ErrorHandler:
    Debug.Print "RenderProjectGantt Error: " & Err.Description
    Application.ScreenUpdating = True
End Sub

Public Sub RenderPersonGantt()
    Dim ws As Worksheet
    Dim phases As Collection
    Dim timeRange As Variant
    Dim persons As Collection
    Dim startDate As Date, endDate As Date
    Dim monthCount As Integer
    Dim currentRow As Long
    Dim personName As String
    Dim phase As Variant
    Dim i As Long, j As Long, k As Integer
    Dim monthlyLoads() As Double
    Dim m As Integer
    
    On Error GoTo ErrorHandler
    
    Application.ScreenUpdating = False
    
    ' 取得或建立工作表
    Set ws = GetOrCreateSheet(SHEET_PERSON_GANTT)
    ws.Cells.Clear
    
    ' 解析資料
    Set phases = ParseConfigData()
    If phases.Count = 0 Then
        ws.Cells(1, 1).Value = "無資料。請在 Config 工作表輸入專案資料。"
        GoTo Cleanup
    End If
    
    ' 取得時間範圍
    timeRange = GetTimeRange(phases)
    startDate = timeRange(0)
    endDate = timeRange(1)
    monthCount = DateDiff("m", startDate, endDate) + 1
    
    ' 繪製標題列
    Call DrawTimelineHeader(ws, startDate, monthCount)
    
    ' 取得人員清單
    Set persons = GetPersonList(phases)
    
    ' 繪製每個人員
    currentRow = GANTT_HEADER_ROWS + 1
    
    For i = 1 To persons.Count
        personName = persons(i)
        
        ' 繪製人員名稱
        ws.Cells(currentRow, 1).Value = personName
        ws.Cells(currentRow, 1).Font.Bold = True
        ws.Cells(currentRow, 1).Font.Size = 11
        
        ' 計算並顯示月負載
        ReDim monthlyLoads(0 To monthCount - 1)
        Call CalculateMonthlyLoad(phases, personName, startDate, monthCount, monthlyLoads)
        Call DrawLoadIndicators(ws, currentRow, monthlyLoads, monthCount)
        
        currentRow = currentRow + 1
        
        ' 繪製該人員參與的所有專案階段
        For j = 1 To phases.Count
            phase = phases(j)
            If Not phase.IsPending Then
                For k = 0 To phase.AssignmentCount - 1
                    If phase.Assignments(k).PersonName = personName Then
                        ' 顯示專案-階段名稱
                        ws.Cells(currentRow, 1).Value = "  " & phase.ProjectName & " - " & phase.PhaseName
                        ws.Cells(currentRow, 1).Font.Color = RGB(100, 100, 100)
                        
                        ' 繪製條塊
                        Call DrawPhaseBar(ws, currentRow, phase, startDate, phase.ProjectIndex)
                        
                        currentRow = currentRow + 1
                        Exit For
                    End If
                Next k
            End If
        Next j
        
        currentRow = currentRow + 1 ' 人員間空一列
    Next i
    
    ' 調整欄寬
    ws.Columns(1).ColumnWidth = 30
    
Cleanup:
    Application.ScreenUpdating = True
    Exit Sub
    
ErrorHandler:
    Debug.Print "RenderPersonGantt Error: " & Err.Description
    Application.ScreenUpdating = True
End Sub

' === 輔助函數 ===

' 繪製年/月標題列
Private Sub DrawTimelineHeader(ws As Worksheet, startDate As Date, monthCount As Integer)
    Dim col As Integer
    Dim currentDate As Date
    Dim currentYear As Integer, lastYear As Integer
    Dim yearStartCol As Integer
    Dim i As Integer
    
    col = 2 ' 從第 2 欄開始 (第 1 欄為標籤)
    currentDate = startDate
    lastYear = 0
    yearStartCol = col
    
    For i = 0 To monthCount - 1
        currentYear = Year(currentDate)
        
        ' 年份標題 (Row 1)
        If currentYear <> lastYear Then
            If lastYear > 0 Then
                ' 合併前一年的儲存格
                If col - 1 > yearStartCol Then
                    ws.Range(ws.Cells(1, yearStartCol), ws.Cells(1, col - 1)).Merge
                End If
            End If
            yearStartCol = col
            ws.Cells(1, col).Value = currentYear
            ws.Cells(1, col).HorizontalAlignment = xlCenter
            ws.Cells(1, col).Font.Bold = True
            lastYear = currentYear
        End If
        
        ' 設定年份背景色
        ws.Cells(1, col).Interior.Color = GetYearColor(currentYear - Year(startDate))
        ws.Cells(2, col).Interior.Color = GetYearColor(currentYear - Year(startDate))
        
        ' 月份標題 (Row 2)
        ws.Cells(2, col).Value = Format(currentDate, "MMM")
        ws.Cells(2, col).HorizontalAlignment = xlCenter
        ws.Columns(col).ColumnWidth = 5
        
        currentDate = DateAdd("m", 1, currentDate)
        col = col + 1
    Next i
    
    ' 合併最後一年的儲存格
    If col - 1 > yearStartCol Then
        ws.Range(ws.Cells(1, yearStartCol), ws.Cells(1, col - 1)).Merge
    End If
    
    ' 設定標題列樣式
    With ws.Range(ws.Cells(1, 1), ws.Cells(2, col - 1))
        .Font.Color = GetHeaderTextColor()
        .Interior.Color = GetHeaderColor()
    End With
    
    ' 恢復第一欄的背景
    ws.Cells(1, 1).Interior.Color = GetHeaderColor()
    ws.Cells(2, 1).Interior.Color = GetHeaderColor()
    ws.Cells(1, 1).Value = ""
    ws.Cells(2, 1).Value = "Project/Person"
End Sub

' 繪製階段條塊
Private Sub DrawPhaseBar(ws As Worksheet, rowNum As Long, phase As Variant, _
                          startDate As Date, projectIndex As Integer)
    Dim startCol As Integer, endCol As Integer
    Dim barColor As Long
    
    ' 計算欄位位置
    startCol = DateDiff("m", startDate, phase.StartDate) + 2
    endCol = DateDiff("m", startDate, phase.EndDate) + 2
    
    ' 確保在有效範圍內
    If startCol < 2 Then startCol = 2
    
    ' 取得顏色
    barColor = GetProjectColor(projectIndex)
    
    ' 繪製條塊
    With ws.Range(ws.Cells(rowNum, startCol), ws.Cells(rowNum, endCol))
        .Interior.Color = barColor
        .Font.Color = RGB(255, 255, 255)
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
        .Value = phase.PhaseName
        
        ' 加入邊框
        .Borders.LineStyle = xlContinuous
        .Borders.Color = RGB(200, 200, 200)
    End With
End Sub

' 計算人員月負載
Private Sub CalculateMonthlyLoad(phases As Collection, personName As String, _
                                   startDate As Date, monthCount As Integer, _
                                   ByRef monthlyLoads() As Double)
    Dim phase As Variant
    Dim i As Long, k As Integer, m As Integer
    Dim phaseStartMonth As Integer, phaseEndMonth As Integer
    
    ' 初始化
    For m = 0 To monthCount - 1
        monthlyLoads(m) = 0
    Next m
    
    ' 累計每月負載
    For i = 1 To phases.Count
        phase = phases(i)
        If Not phase.IsPending Then
            For k = 0 To phase.AssignmentCount - 1
                If phase.Assignments(k).PersonName = personName Then
                    phaseStartMonth = DateDiff("m", startDate, phase.StartDate)
                    phaseEndMonth = DateDiff("m", startDate, phase.EndDate)
                    
                    For m = phaseStartMonth To phaseEndMonth
                        If m >= 0 And m < monthCount Then
                            monthlyLoads(m) = monthlyLoads(m) + phase.Assignments(k).Percentage
                        End If
                    Next m
                    Exit For
                End If
            Next k
        End If
    Next i
End Sub

' 繪製負載指示器
Private Sub DrawLoadIndicators(ws As Worksheet, rowNum As Long, _
                                monthlyLoads() As Double, monthCount As Integer)
    Dim col As Integer
    Dim load As Double
    
    For col = 0 To monthCount - 1
        load = monthlyLoads(col)
        
        With ws.Cells(rowNum, col + 2)
            If load > 0 Then
                .Value = Format(load, "0.0")
                .Font.Bold = True
                .Font.Color = GetLoadColor(load)
                .HorizontalAlignment = xlCenter
                
                ' 背景色提示
                If load > LOAD_WARNING_THRESHOLD Then
                    .Interior.Color = RGB(255, 235, 238) ' 淺紅
                End If
            End If
        End With
    Next col
End Sub

' 取得或建立工作表
Private Function GetOrCreateSheet(sheetName As String) As Worksheet
    Dim ws As Worksheet
    
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = sheetName
    End If
    
    Set GetOrCreateSheet = ws
End Function
