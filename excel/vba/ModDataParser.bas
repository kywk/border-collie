Attribute VB_Name = "ModDataParser"
Option Explicit

'=============================================================================
' BorderCollie Excel VBA - Data Parser Module
' 解析 Config 工作表資料
'=============================================================================

' === 資料結構 ===
Public Type Assignment
    PersonName As String
    Percentage As Double
End Type

Public Type Phase
    ProjectName As String
    ProjectIndex As Integer
    IsPending As Boolean
    PhaseName As String
    StartDate As Date
    EndDate As Date
    Assignments() As Assignment
    AssignmentCount As Integer
End Type

' === 解析 Config 資料 ===
Public Function ParseConfigData() As Collection
    Dim wsConfig As Worksheet
    Dim phases As New Collection
    Dim phase As Phase
    Dim lastRow As Long
    Dim i As Long
    Dim projectIndex As Integer
    Dim lastProjectName As String
    
    On Error GoTo ErrorHandler
    
    Set wsConfig = ThisWorkbook.Worksheets(SHEET_CONFIG)
    lastRow = wsConfig.Cells(wsConfig.Rows.Count, COL_PROJECT_NAME).End(xlUp).Row
    
    projectIndex = -1
    lastProjectName = ""
    
    ' 從第 2 列開始 (第 1 列為標題)
    For i = 2 To lastRow
        ' 跳過空白列
        If Trim(wsConfig.Cells(i, COL_PROJECT_NAME).Value) = "" And _
           Trim(wsConfig.Cells(i, COL_PHASE_NAME).Value) = "" Then
            GoTo NextRow
        End If
        
        ' 解析階段資料
        phase = ParsePhaseRow(wsConfig, i)
        
        ' 更新專案索引
        If phase.ProjectName <> lastProjectName Then
            projectIndex = projectIndex + 1
            lastProjectName = phase.ProjectName
        End If
        phase.ProjectIndex = projectIndex
        
        ' 只加入非 Pending 且有效的階段
        If phase.PhaseName <> "" And phase.StartDate > 0 And phase.EndDate > 0 Then
            phases.Add phase
        End If
        
NextRow:
    Next i
    
    Set ParseConfigData = phases
    Exit Function
    
ErrorHandler:
    Debug.Print "ParseConfigData Error: " & Err.Description
    Set ParseConfigData = New Collection
End Function

' === 解析單一列資料 ===
Private Function ParsePhaseRow(ws As Worksheet, rowNum As Long) As Phase
    Dim phase As Phase
    Dim colOffset As Integer
    Dim personName As String
    Dim percentage As Double
    Dim tempAssignments() As Assignment
    Dim assignCount As Integer
    
    ReDim tempAssignments(0 To MAX_PERSONS_PER_PHASE - 1)
    assignCount = 0
    
    With phase
        .ProjectName = Trim(ws.Cells(rowNum, COL_PROJECT_NAME).Value)
        .IsPending = (UCase(Trim(ws.Cells(rowNum, COL_PENDING).Value)) = "Y")
        .PhaseName = Trim(ws.Cells(rowNum, COL_PHASE_NAME).Value)
        
        ' 解析日期
        .StartDate = ParseDateValue(ws.Cells(rowNum, COL_START_DATE).Value)
        .EndDate = ParseDateValue(ws.Cells(rowNum, COL_END_DATE).Value)
        
        ' 解析人員指派 (每組 2 欄: 人員名, 比例)
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
        
        ' 調整陣列大小
        If assignCount > 0 Then
            ReDim Preserve tempAssignments(0 To assignCount - 1)
            .Assignments = tempAssignments
        End If
        .AssignmentCount = assignCount
    End With
    
    ParsePhaseRow = phase
End Function

' === 解析日期值 ===
Private Function ParseDateValue(cellValue As Variant) As Date
    Dim dateStr As String
    
    On Error GoTo InvalidDate
    
    If IsDate(cellValue) Then
        ParseDateValue = CDate(cellValue)
        Exit Function
    End If
    
    dateStr = Trim(CStr(cellValue))
    
    ' 處理 YYYY-MM 格式
    If Len(dateStr) = 7 And Mid(dateStr, 5, 1) = "-" Then
        ParseDateValue = DateSerial(CInt(Left(dateStr, 4)), CInt(Right(dateStr, 2)), 1)
        Exit Function
    End If
    
    ' 處理 YYYY-MM-DD 格式
    If Len(dateStr) = 10 And Mid(dateStr, 5, 1) = "-" And Mid(dateStr, 8, 1) = "-" Then
        ParseDateValue = DateSerial( _
            CInt(Left(dateStr, 4)), _
            CInt(Mid(dateStr, 6, 2)), _
            CInt(Right(dateStr, 2)))
        Exit Function
    End If
    
InvalidDate:
    ParseDateValue = 0
End Function

' === 取得時間範圍 ===
Public Function GetTimeRange(phases As Collection) As Variant
    Dim minDate As Date
    Dim maxDate As Date
    Dim phase As Variant
    Dim i As Long
    
    minDate = DateSerial(9999, 12, 31)
    maxDate = DateSerial(1900, 1, 1)
    
    For i = 1 To phases.Count
        phase = phases(i)
        
        ' 跳過 Pending 專案
        If Not phase.IsPending Then
            If phase.StartDate < minDate Then minDate = phase.StartDate
            If phase.EndDate > maxDate Then maxDate = phase.EndDate
        End If
    Next i
    
    ' 擴展到月初和月末
    minDate = DateSerial(Year(minDate), Month(minDate), 1)
    maxDate = DateSerial(Year(maxDate), Month(maxDate) + 1, 0)
    
    GetTimeRange = Array(minDate, maxDate)
End Function

' === 取得所有人員清單 ===
Public Function GetPersonList(phases As Collection) As Collection
    Dim persons As New Collection
    Dim phase As Variant
    Dim i As Long, j As Integer
    Dim personName As String
    Dim found As Boolean
    Dim p As Variant
    
    For i = 1 To phases.Count
        phase = phases(i)
        
        ' 跳過 Pending 專案
        If Not phase.IsPending Then
            For j = 0 To phase.AssignmentCount - 1
                personName = phase.Assignments(j).PersonName
                
                ' 檢查是否已存在
                found = False
                For Each p In persons
                    If p = personName Then
                        found = True
                        Exit For
                    End If
                Next p
                
                If Not found Then
                    persons.Add personName
                End If
            Next j
        End If
    Next i
    
    Set GetPersonList = persons
End Function

' === 取得專案清單 (不重複) ===
Public Function GetProjectList(phases As Collection) As Collection
    Dim projects As New Collection
    Dim phase As Variant
    Dim i As Long
    Dim found As Boolean
    Dim p As Variant
    
    For i = 1 To phases.Count
        phase = phases(i)
        
        ' 跳過 Pending 專案
        If Not phase.IsPending Then
            ' 檢查是否已存在
            found = False
            For Each p In projects
                If p = phase.ProjectName Then
                    found = True
                    Exit For
                End If
            Next p
            
            If Not found Then
                projects.Add phase.ProjectName
            End If
        End If
    Next i
    
    Set GetProjectList = projects
End Function
