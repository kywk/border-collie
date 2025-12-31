Attribute VB_Name = "ModConfig"
Option Explicit

'=============================================================================
' BorderCollie Excel VBA - Configuration Module
' 常數定義與設定
'=============================================================================

' === 工作表名稱 ===
Public Const SHEET_CONFIG As String = "Config"
Public Const SHEET_PROJECT_GANTT As String = "ProjectGantt"
Public Const SHEET_PERSON_GANTT As String = "PersonGantt"

' === Config 工作表欄位索引 ===
Public Const COL_PROJECT_NAME As Integer = 1      ' A: 專案名稱
Public Const COL_PENDING As Integer = 2           ' B: 擱置 (Y/N)
Public Const COL_PHASE_NAME As Integer = 3        ' C: 階段名稱
Public Const COL_START_DATE As Integer = 4        ' D: 開始日期
Public Const COL_END_DATE As Integer = 5          ' E: 結束日期
Public Const COL_PERSON_START As Integer = 6      ' F: 人員1 開始欄
Public Const MAX_PERSONS_PER_PHASE As Integer = 8 ' 每階段最多人員數

' === 甘特圖設定 ===
Public Const GANTT_HEADER_ROWS As Integer = 2     ' 標題列數 (年/月)
Public Const GANTT_MONTH_WIDTH As Double = 40     ' 每月欄寬 (points)
Public Const GANTT_ROW_HEIGHT As Double = 20      ' 每列高度 (points)

' === 負載警示閾值 ===
Public Const LOAD_WARNING_THRESHOLD As Double = 1.1

' === 顏色定義 (RGB) ===
' 專案顏色循環 (10 種顏色)
Public Function GetProjectColor(ByVal projectIndex As Integer) As Long
    Dim colors(0 To 9) As Long
    colors(0) = RGB(66, 133, 244)   ' Blue
    colors(1) = RGB(52, 168, 83)    ' Green
    colors(2) = RGB(251, 188, 4)    ' Yellow
    colors(3) = RGB(234, 67, 53)    ' Red
    colors(4) = RGB(154, 103, 234)  ' Purple
    colors(5) = RGB(255, 112, 67)   ' Orange
    colors(6) = RGB(0, 172, 193)    ' Cyan
    colors(7) = RGB(233, 30, 99)    ' Pink
    colors(8) = RGB(121, 85, 72)    ' Brown
    colors(9) = RGB(96, 125, 139)   ' Blue Grey
    
    GetProjectColor = colors(projectIndex Mod 10)
End Function

' 年份背景色
Public Function GetYearColor(ByVal yearIndex As Integer) As Long
    If yearIndex Mod 2 = 0 Then
        GetYearColor = RGB(245, 245, 245) ' 淺灰
    Else
        GetYearColor = RGB(227, 242, 253) ' 淺藍
    End If
End Function

' 負載警示顏色
Public Function GetLoadColor(ByVal load As Double) As Long
    If load > LOAD_WARNING_THRESHOLD Then
        GetLoadColor = RGB(244, 67, 54)   ' 紅色
    Else
        GetLoadColor = RGB(76, 175, 80)   ' 綠色
    End If
End Function

' 標題列背景色
Public Function GetHeaderColor() As Long
    GetHeaderColor = RGB(63, 81, 181)   ' Indigo
End Function

' 標題文字顏色
Public Function GetHeaderTextColor() As Long
    GetHeaderTextColor = RGB(255, 255, 255) ' White
End Function
