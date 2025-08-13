import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let bucketName: string
    let isPublic: boolean
    let file: File | null = null
    let filePath: string | null = null

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (file upload)
      const formData = await request.formData()
      bucketName = (formData.get("bucketName") as string) || "chat-media"
      isPublic = formData.get("isPublic") === "true"
      file = formData.get("file") as File | null
      filePath = formData.get("filePath") as string | null
    } else {
      // Handle JSON (bucket creation only)
      const body = await request.json()
      bucketName = body.bucketName || "chat-media"
      isPublic = body.isPublic !== false
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ Missing Supabase URL or Service Role Key")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verificar si el bucket existe
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets()

    if (listError) {
      console.error("Error listing buckets:", listError)
      return NextResponse.json({ error: "Error listing buckets" }, { status: 500 })
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName)

    if (!bucketExists) {
      // Crear el bucket si no existe
      console.log(`🔧 Creando bucket '${bucketName}'...`)
      const { data, error: createError } = await adminClient.storage.createBucket(bucketName, {
        public: isPublic,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/zip",
          "application/x-rar-compressed",
          "audio/mpeg",
          "audio/wav",
          "audio/ogg",
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ],
        fileSizeLimit: 16 * 1024 * 1024, // 16MB
      })

      if (createError) {
        console.error(`❌ Error creando bucket '${bucketName}':`, createError)
        return NextResponse.json({ error: `Error creating bucket: ${createError.message}` }, { status: 500 })
      }

      console.log(`✅ Bucket '${bucketName}' creado exitosamente`)
    } else {
      console.log(`✅ Bucket '${bucketName}' ya existe`)
    }

    if (file && filePath) {
      console.log(`📤 Subiendo archivo: ${file.name} a ${filePath}`)

      // Convertir File a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Subir archivo usando el admin client (bypasea RLS)
      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from(bucketName)
        .upload(filePath, arrayBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        console.error("❌ Error subiendo archivo:", uploadError)
        return NextResponse.json({ error: `Error uploading file: ${uploadError.message}` }, { status: 500 })
      }

      // Obtener URL pública
      const { data: publicUrlData } = adminClient.storage.from(bucketName).getPublicUrl(filePath)

      console.log(`✅ Archivo subido exitosamente: ${uploadData.path}`)
      console.log(`🔗 URL pública: ${publicUrlData.publicUrl}`)

      return NextResponse.json({
        success: true,
        bucketExists: bucketExists,
        bucketCreated: !bucketExists,
        fileUploaded: true,
        filePath: uploadData.path,
        publicUrl: publicUrlData.publicUrl,
      })
    }

    return NextResponse.json({
      success: true,
      bucketExists: bucketExists,
      bucketCreated: !bucketExists,
    })
  } catch (error) {
    console.error("💥 Error en ensure-bucket API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
