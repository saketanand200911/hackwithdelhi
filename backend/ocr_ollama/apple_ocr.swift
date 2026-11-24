import Foundation
import Vision
import AppKit
import PDFKit

struct TextBlock {
    let text: String
    let bbox: CGRect
}

func recognizeCGImage(_ cgImage: CGImage, orientation: CGImagePropertyOrientation = .up) -> [String] {
    var extractedLines: [String] = []
    
    let request = VNRecognizeTextRequest { (req, error) in
        guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
        
        // Group observations into horizontal rows if their vertical midpoints are close
        var blocks: [TextBlock] = []
        for obs in observations {
            if let top = obs.topCandidates(1).first {
                let trimmed = top.string.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    blocks.append(TextBlock(text: trimmed, bbox: obs.boundingBox))
                }
            }
        }
        
        // Sort primarily top-to-bottom (y descending in Vision coordinates)
        // Group blocks that have overlapping vertical ranges
        var rows: [[TextBlock]] = []
        let sortedBlocks = blocks.sorted { b1, b2 in
            let y1 = b1.bbox.midY
            let y2 = b2.bbox.midY
            return y1 > y2
        }
        
        for block in sortedBlocks {
            var placed = false
            for i in 0..<rows.count {
                let rowMidY = rows[i].map { $0.bbox.midY }.reduce(0, +) / CGFloat(rows[i].count)
                let rowHeight = rows[i].map { $0.bbox.height }.reduce(0, +) / CGFloat(rows[i].count)
                let tolerance = max(0.015, rowHeight * 0.7)
                
                if abs(block.bbox.midY - rowMidY) < tolerance {
                    rows[i].append(block)
                    placed = true
                    break
                }
            }
            if !placed {
                rows.append([block])
            }
        }
        
        // Sort each row left-to-right (x ascending)
        for row in rows {
            let sortedRow = row.sorted { $0.bbox.minX < $1.bbox.minX }
            let lineText = sortedRow.map { $0.text }.joined(separator: "  ")
            if !lineText.isEmpty {
                extractedLines.append(lineText)
            }
        }
    }
    
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["en-US"]
    
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
    try? handler.perform([request])
    
    return extractedLines
}

func processFile(at path: String) {
    let url = URL(fileURLWithPath: path)
    let ext = url.pathExtension.lowercased()
    
    if ext == "pdf" {
        guard let pdfDoc = PDFDocument(url: url) else {
            fputs("Error: Could not open PDF file\n", stderr)
            exit(1)
        }
        
        // Check if PDF already has embedded selectable text
        var fullPdfText = ""
        for i in 0..<pdfDoc.pageCount {
            if let page = pdfDoc.page(at: i), let str = page.string, !str.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                fullPdfText += str + "\n"
            }
        }
        
        if fullPdfText.trimmingCharacters(in: .whitespacesAndNewlines).count > 40 {
            print(fullPdfText.trimmingCharacters(in: .whitespacesAndNewlines))
            return
        }
        
        // Scanned PDF: Render first 2 pages to CGImage and run OCR
        for i in 0..<min(pdfDoc.pageCount, 2) {
            if let page = pdfDoc.page(at: i) {
                let rect = page.bounds(for: .mediaBox)
                let scale: CGFloat = 2.0 // 144 DPI equivalent for high OCR precision
                let size = CGSize(width: rect.width * scale, height: rect.height * scale)
                let image = page.thumbnail(of: size, for: .mediaBox)
                if let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) {
                    let lines = recognizeCGImage(cgImage)
                    for line in lines {
                        print(line)
                    }
                }
            }
        }
        return
    }
    
    // Image file processing (JPEG, PNG, HEIC, TIFF, WebP, etc.)
    guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil) else {
        fputs("Error: Could not create image source for \(path)\n", stderr)
        exit(1)
    }
    
    guard let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else {
        fputs("Error: Could not decode image at index 0\n", stderr)
        exit(1)
    }
    
    // Read EXIF orientation
    var orientation: CGImagePropertyOrientation = .up
    if let properties = CGImageSourceCopyPropertiesAtIndex(imageSource, 0, nil) as? [CFString: Any],
       let rawOrientation = properties[kCGImagePropertyOrientation] as? UInt32,
       let propOrientation = CGImagePropertyOrientation(rawValue: rawOrientation) {
        orientation = propOrientation
    }
    
    let lines = recognizeCGImage(cgImage, orientation: orientation)
    for line in lines {
        print(line)
    }
}

let args = CommandLine.arguments
guard args.count > 1 else {
    print("Usage: apple_ocr <path_to_image_or_pdf>")
    exit(1)
}

processFile(at: args[1])
