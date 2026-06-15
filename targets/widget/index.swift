import WidgetKit
import SwiftUI

// メインアプリと共有する App Group。app.json の application-groups と一致させること。
private let appGroup = "group.com.abshrimp.kitmate"
private let payloadKey = "payload"

// MARK: - 共有ペイロード (JS 側 WidgetPayload と一致)

struct WClass: Decodable {
  let period: Int
  let start: String
  let end: String
  let name: String
  let room: String
  let color: String?
}

struct WAssignment: Decodable {
  let title: String
  let course: String
  let dueAt: Double
  let dueLabel: String
}

struct WPayload: Decodable {
  let updatedAt: Double
  let dateLabel: String
  let isWeekend: Bool
  let classes: [WClass]
  let assignment: WAssignment?
}

private func loadPayload() -> WPayload? {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: payloadKey),
    let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(WPayload.self, from: data)
}

private func colorFromHex(_ hex: String?) -> Color {
  guard var s = hex else { return .accentColor }
  if s.hasPrefix("#") { s.removeFirst() }
  guard let v = UInt64(s, radix: 16), s.count == 6 else { return .accentColor }
  let r = Double((v & 0xFF0000) >> 16) / 255
  let g = Double((v & 0x00FF00) >> 8) / 255
  let b = Double(v & 0x0000FF) / 255
  return Color(red: r, green: g, blue: b)
}

// MARK: - Timeline

struct Entry: TimelineEntry {
  let date: Date
  let payload: WPayload?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry {
    Entry(date: Date(), payload: nil)
  }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: Date(), payload: loadPayload()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let entry = Entry(date: Date(), payload: loadPayload())
    // 1 時間ごとに更新を促す (アプリ稼働時にも reloadWidget で即時更新される)
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - View

struct KitmateWidgetEntryView: View {
  var entry: Entry

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Text("KITmate").font(.caption).bold().foregroundColor(.accentColor)
        Spacer()
        Text(entry.payload?.dateLabel ?? "").font(.caption2).foregroundColor(.secondary)
      }

      if let payload = entry.payload {
        let classes = Array(payload.classes.prefix(5))
        if payload.isWeekend || classes.isEmpty {
          Text(payload.isWeekend ? "今日は授業がありません" : "今日の授業はありません")
            .font(.footnote).foregroundColor(.secondary).padding(.top, 4)
        } else {
          ForEach(Array(classes.enumerated()), id: \.offset) { _, c in
            HStack(spacing: 6) {
              Text("\(c.period)")
                .font(.caption2).bold().foregroundColor(.white)
                .frame(width: 18, height: 18)
                .background(colorFromHex(c.color)).cornerRadius(5)
              Text(c.name).font(.caption).lineLimit(1)
              Spacer(minLength: 4)
              Text(c.room).font(.caption2).foregroundColor(.secondary)
            }
          }
        }
        if let a = payload.assignment {
          Divider().padding(.vertical, 2)
          HStack(spacing: 6) {
            Text("📚").font(.caption2)
            Text(a.title).font(.caption2).lineLimit(1)
            Spacer(minLength: 4)
            Text(a.dueLabel).font(.caption2).bold().foregroundColor(.orange)
          }
        }
      } else {
        Text("アプリを開いて更新").font(.footnote).foregroundColor(.secondary).padding(.top, 4)
      }
      Spacer(minLength: 0)
    }
    .padding(12)
  }
}

// MARK: - Widget

struct KitmateWidget: Widget {
  let kind = "KitmateWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        KitmateWidgetEntryView(entry: entry).containerBackground(.fill.tertiary, for: .widget)
      } else {
        KitmateWidgetEntryView(entry: entry).padding()
      }
    }
    .configurationDisplayName("KITmate")
    .description("今日の時間割と直近の課題")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct KitmateWidgetBundle: WidgetBundle {
  var body: some Widget {
    KitmateWidget()
  }
}
