Attribute VB_Name = "ModMain"
Option Explicit

'=============================================================================
' BorderCollie Excel VBA - Main Module
' 主程式進入點與更新控制
'=============================================================================

' === 公開呼叫函數 (供按鈕使用) ===

' 更新所有圖表
Public Sub UpdateAllCharts()
    Application.StatusBar = "正在更新專案甘特圖..."
    Call RenderProjectGantt
    
    Application.StatusBar = "正在更新人力甘特圖..."
    Call RenderPersonGantt
    
    Application.StatusBar = False
    MsgBox "圖表更新完成！", vbInformation
End Sub

' 僅更新專案甘特圖
Public Sub UpdateProjectGantt()
    Application.StatusBar = "正在更新專案甘特圖..."
    Call RenderProjectGantt
    Application.StatusBar = False
End Sub

' 僅更新人力甘特圖
Public Sub UpdatePersonGantt()
    Application.StatusBar = "正在更新人力甘特圖..."
    Call RenderPersonGantt
    Application.StatusBar = False
End Sub

' 匯入純文字
Public Sub ImportText()
    Call ImportFromText
End Sub

' 匯出純文字
Public Sub ExportText()
    Call ExportToText
End Sub

' === 初始化設定 ===
Public Sub InitializeWorkbook()
    Dim ws As Worksheet
    
    ' 建立 Config 工作表 (如不存在)
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(SHEET_CONFIG)
    On Error GoTo 0
    
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(Before:=ThisWorkbook.Worksheets(1))
        ws.Name = SHEET_CONFIG
    End If
    
    ' 設定標題列
    Call SetupConfigHeaders(ws)
    
    MsgBox "初始化完成！請在 Config 工作表輸入專案資料。", vbInformation
End Sub

' 設定 Config 標題列
Private Sub SetupConfigHeaders(ws As Worksheet)
    Dim headers() As String
    Dim i As Integer
    Dim col As Integer
    
    ' 基本欄位
    ws.Cells(1, COL_PROJECT_NAME).Value = "專案名稱"
    ws.Cells(1, COL_PENDING).Value = "擱置"
    ws.Cells(1, COL_PHASE_NAME).Value = "階段"
    ws.Cells(1, COL_START_DATE).Value = "開始日期"
    ws.Cells(1, COL_END_DATE).Value = "結束日期"
    
    ' 人員欄位
    For i = 1 To MAX_PERSONS_PER_PHASE
        col = COL_PERSON_START + (i - 1) * 2
        ws.Cells(1, col).Value = "人員" & i
        ws.Cells(1, col + 1).Value = "比例" & i
    Next i
    
    ' 設定樣式
    With ws.Range(ws.Cells(1, 1), ws.Cells(1, COL_PERSON_START + MAX_PERSONS_PER_PHASE * 2 - 1))
        .Font.Bold = True
        .Interior.Color = GetHeaderColor()
        .Font.Color = GetHeaderTextColor()
        .HorizontalAlignment = xlCenter
    End With
    
    ' 設定欄寬
    ws.Columns(COL_PROJECT_NAME).ColumnWidth = 20
    ws.Columns(COL_PENDING).ColumnWidth = 6
    ws.Columns(COL_PHASE_NAME).ColumnWidth = 12
    ws.Columns(COL_START_DATE).ColumnWidth = 12
    ws.Columns(COL_END_DATE).ColumnWidth = 12
    
    For i = 0 To MAX_PERSONS_PER_PHASE - 1
        ws.Columns(COL_PERSON_START + i * 2).ColumnWidth = 10
        ws.Columns(COL_PERSON_START + i * 2 + 1).ColumnWidth = 6
    Next i
    
    ' 凍結標題列
    ws.Rows(2).Select
    ActiveWindow.FreezePanes = True
    
    ' 設定資料驗證 (擱置欄)
    With ws.Range(ws.Cells(2, COL_PENDING), ws.Cells(1000, COL_PENDING)).Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
             Formula1:="Y,N"
        .ShowError = True
        .ErrorMessage = "請輸入 Y 或 N"
    End With
End Sub
