import CoreImage
import Foundation
import Vision

// cut in.jpg outdir name : 원본 크기의 알파 mask 와 오려낸 PNG
let a = CommandLine.arguments
let ci = CIImage(
  contentsOf: URL(fileURLWithPath: a[1]),
  options: [.applyOrientationProperty: true])!
let ctx = CIContext()
let cg = ctx.createCGImage(ci, from: ci.extent)!
let req = VNGenerateForegroundInstanceMaskRequest()
let h = VNImageRequestHandler(cgImage: cg)
try h.perform([req])
guard let r = req.results?.first else {
  print(a[3], "없음")
  exit(1)
}
let buf = try r.generateScaledMaskForImage(forInstances: r.allInstances, from: h)
// 가장자리의 종이 색을 걷어낸다. 긴 변의 1/1400 만큼 안으로
let edge = Double(max(cg.width, cg.height)) / 1400
let mask = CIImage(cvPixelBuffer: buf)
  .applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: edge])
  .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: edge * 0.35])
  .cropped(to: CGRect(x: 0, y: 0, width: cg.width, height: cg.height))
let base = CIImage(cgImage: cg)
let cut = base.applyingFilter(
  "CIBlendWithMask",
  parameters: [
    kCIInputBackgroundImageKey: CIImage.empty(), kCIInputMaskImageKey: mask,
  ])
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
try ctx.writePNGRepresentation(
  of: cut.cropped(to: base.extent), to: URL(fileURLWithPath: "\(a[2])/\(a[3])-cut.png"),
  format: .RGBA8, colorSpace: cs)
try ctx.writePNGRepresentation(
  of: mask.cropped(to: base.extent), to: URL(fileURLWithPath: "\(a[2])/\(a[3])-mask.png"),
  format: .RGBA8, colorSpace: cs)
print(a[3], cg.width, cg.height, "개체", r.allInstances.count)
