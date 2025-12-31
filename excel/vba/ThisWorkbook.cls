VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

'=============================================================================
' BorderCollie Excel VBA - Workbook Events
' 工作簿事件處理
'=============================================================================

Private Sub Workbook_Open()
    ' 開啟時自動更新圖表
    On Error Resume Next
    
    ' 檢查是否有 Config 工作表
    Dim wsConfig As Worksheet
    Set wsConfig = ThisWorkbook.Worksheets(SHEET_CONFIG)
    
    If wsConfig Is Nothing Then
        ' 首次開啟，初始化
        Call InitializeWorkbook
    Else
        ' 檢查是否有資料
        If wsConfig.Cells(2, COL_PROJECT_NAME).Value <> "" Then
            ' 有資料，更新圖表
            Call RenderProjectGantt
            Call RenderPersonGantt
        End If
    End If
    
    On Error GoTo 0
End Sub

Private Sub Workbook_SheetActivate(ByVal Sh As Object)
    ' 切換到甘特圖工作表時自動更新
    On Error Resume Next
    
    Select Case Sh.Name
        Case SHEET_PROJECT_GANTT
            Call RenderProjectGantt
        Case SHEET_PERSON_GANTT
            Call RenderPersonGantt
    End Select
    
    On Error GoTo 0
End Sub
